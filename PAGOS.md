# Cobro por no presentarse — diseño técnico

Documento de trabajo. **Nada de esto está construido todavía.** Sirve para
decidir con el dueño antes de escribir código, y para presupuestarlo aparte.

---

## 1. Lo que pidió y lo que se puede hacer

**Lo que pidió:** retener 20 € por comensal al reservar y cobrarlos si no aparecen.

**El problema:** una retención de tarjeta **caduca en unos 7 días**. Si alguien
reserva el 3 para el 20, no hay nada que retener el día 3: el banco lo suelta
antes de la fecha. Y reservar con semanas de antelación es justo lo normal en
los días que más duelen los plantones.

**Lo que sí funciona**, y es lo que hacen OpenTable, TheFork y CoverManager:

> Se **guarda la tarjeta** al reservar, sin mover un euro, y solo se **cobra si
> no aparecen**.

Para el cliente el mensaje es el mismo — *«si no vienes y no avisas, se te cobran
20 € por persona»* — pero no ve dinero retenido, y el negocio tiene el cobro
garantizado igual. Además no hay comisión mientras no se cobre.

---

## 2. Cómo funciona por dentro

Se usa **Stripe**, con dos operaciones distintas:

| Momento | Operación | Qué pasa |
|---|---|---|
| Al reservar | `SetupIntent` | El cliente mete la tarjeta y autoriza guardarla. **No se cobra nada** |
| Si no aparece | `PaymentIntent` con `off_session` | Se cobra la penalización sin que el cliente esté delante |
| Si viene, o cancela a tiempo | *nada* | La tarjeta guardada se olvida |

**La tarjeta nunca pasa por nuestro servidor.** El cliente la teclea dentro de un
componente de Stripe; nosotros solo guardamos dos referencias suyas (`customer`
y `payment_method`), que sin las claves de Stripe no valen nada. Eso mantiene el
proyecto fuera del alcance de la normativa PCI.

### El punto delicado: la autenticación europea

En Europa, un cobro sin el cliente delante **puede ser rechazado por el banco**
si pide autenticación (SCA). Se mitiga pidiendo esa autenticación **al guardar la
tarjeta**, que es cuando el cliente sí está delante y puede confirmar en su app.
Aun así, un porcentaje de cobros fallará.

**Hay que asumirlo desde el diseño.** Cuando el cobro se rechace, el sistema le
manda al cliente un enlace de pago y avisa al negocio. No se puede prometer que
se cobra el 100 % de los plantones.

---

## 3. Flujo completo

**Al reservar**

1. El cliente rellena los cuatro pasos de siempre.
2. Aparece un quinto paso: la tarjeta, con el aviso de cuánto y cuándo se cobraría.
3. Acepta las condiciones (casilla obligatoria, con enlace al texto completo).
4. Stripe guarda la tarjeta. La reserva se crea **solo si eso sale bien**.

**El día siguiente al servicio**

5. En el panel, cada reserva pasada tiene un botón **No se presentó**.
6. Al pulsarlo se pide confirmación con el importe exacto: *«Se cobrarán 60 € a
   Juan Pérez. Esto no se puede deshacer desde aquí.»*
7. Se cobra y se registra. Al cliente le llega un correo explicando el cargo.

**Si el cobro falla**

8. Se marca como fallido, se avisa al negocio y se le manda al cliente un enlace
   para pagar.

---

## 4. Cambios en la base de datos

En `reservas`:

| Campo | Para qué |
|---|---|
| `stripe_customer` | Referencia del cliente en Stripe |
| `stripe_metodo_pago` | La tarjeta guardada |
| `garantia_cents` | Cuánto se cobraría, congelado en el momento de reservar |

El campo `estado` gana dos valores: `no_show` y `cobrada`.

Tabla nueva **`pagos`**, una fila por intento de cobro: reserva, importe, estado
(`pendiente`, `cobrado`, `fallido`, `devuelto`), referencia de Stripe, motivo del
fallo y quién lo ordenó. Sin esto no hay forma de discutir un cargo con un
cliente enfadado, y esa conversación llegará.

Los importes van **en céntimos y como enteros**. Nunca en decimales: 20,00 € es
`2000`.

---

## 5. Piezas nuevas

- **`crear-intencion-pago`** (Edge Function) — prepara el `SetupIntent` al reservar
- **`cobrar-no-show`** (Edge Function) — ejecuta el cargo, solo para personal autorizado
- **`webhook-stripe`** (Edge Function) — recibe los avisos de Stripe: cobros que se
  confirman tarde, disputas, tarjetas caducadas. **Verificando la firma**, o
  cualquiera podría fingir un pago
- **Quinto paso** en el modal de reserva, con el componente de tarjeta de Stripe
- **Botón «No se presentó»** en el panel, con confirmación e importe a la vista
- **`condiciones.html`** — el texto que el cliente acepta al reservar

---

## 6. Lo que necesita el negocio

1. **Cuenta de Stripe** a nombre de la empresa, con CIF e IBAN. La verificación
   tarda unos días.
2. **Los números**: cuánto por comensal, y con cuánta antelación se puede cancelar
   sin coste. Sin ese margen no se sostiene legalmente.
3. **Aceptar que no se cobra todo.** Entre rechazos del banco y tarjetas
   caducadas, se recupera la mayoría, no la totalidad.

---

## 7. Riesgos, dichos en voz alta

**El público del Casino es gente mayor poco dada a la tecnología.** Pedir una
tarjeta para reservar mesa va a espantar a parte de esa clientela: unos
abandonarán y otros llamarán por teléfono, donde no hay tarjeta que valga y por
tanto tampoco protección. Jordi decidió aplicarlo **a todos los clientes**
sabiendo esto. **Conviene medir las reservas web antes y después** y revisarlo a
las pocas semanas: si caen mucho, limitarlo a grupos grandes recupera el volumen
sin perder la protección donde de verdad duele.

**Cobrar mal a alguien es peor que no cobrar.** Un cargo a quien sí vino destroza
la relación y acaba en reseña de una estrella. Por eso el botón pide confirmación
con nombre e importe, y todo queda registrado.

**Una devolución siempre debe ser posible.** Desde el panel de Stripe se devuelve
un cargo en dos clics. Que el dueño lo sepa antes de empezar.

---

## 8. Alcance

Es **más trabajo que todo el sistema de reservas actual junto**: integración de
pagos, webhooks, estados de error, condiciones legales y la conversación con el
cliente cuando algo sale mal. **No entra en los 350 € del encargo inicial** y
debe presupuestarse aparte.

Orden sugerido, para poder parar en cualquier punto con algo que ya funcione:

1. Guardar la tarjeta al reservar, sin cobrar nada todavía
2. El botón de no presentado y el cobro
3. Webhooks y el circuito de cobros fallidos
4. Devoluciones desde el panel

Con el paso 1 hecho el negocio **ya disuade**: quien deja una tarjeta se lo piensa
dos veces antes de no aparecer.
