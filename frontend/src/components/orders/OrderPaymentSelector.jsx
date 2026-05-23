export function OrderPaymentSelector({
  methods,
  selectedMethod,
  setSelectedMethod,
}) {

  return (
    <div className="
      bg-white

      border
      border-zinc-200

      rounded-2xl

      p-4
    ">

      {/* HEADER */}
      <div className="
        mb-5
      ">

        <h2 className="
          text-xl
          font-bold
        ">
          Pagamento
        </h2>

        <p className="
          text-sm
          text-zinc-500
          mt-1
        ">
          Selecione a forma
          de pagamento
        </p>
      </div>

      {/* SELECT */}
      <select
        value={selectedMethod}

        onChange={(e) =>
          setSelectedMethod(
            e.target.value
          )
        }

        className="
          w-full

          border
          border-zinc-200

          rounded-2xl

          px-4
          py-4

          bg-white

          outline-none

          focus:border-black

          transition-all
        "
      >

        {(methods || [])
          .filter(
            (method) =>
              method.enabled
          )
          .map((method) => (

            <option
              key={method.id}
              value={method.id}
            >
              {method.label}
            </option>
          ))}
      </select>
    </div>
  );
}