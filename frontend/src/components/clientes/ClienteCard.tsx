import {
  Phone,
  MapPin,
  DollarSign,
} from "lucide-react";

interface Props {
  cliente: any;
}

export function ClienteCard({
  cliente,
}: Props) {

  return (
    <div className="
      bg-white
      rounded-2xl
      border
      p-4
      flex
      flex-col
      gap-3
    ">

      <div>
        <h3 className="
          font-semibold
          text-lg
        ">
          {cliente.name ||
            "Sem nome"}
        </h3>

        <p className="
          text-sm
          text-zinc-500
        ">
          {cliente.phone}
        </p>
      </div>

      <div className="
        flex
        flex-col
        gap-2
        text-sm
      ">

        <div className="
          flex
          items-center
          gap-2
        ">
          <MapPin size={16} />

          <span>
            {cliente.city ||
              "Cidade não informada"}
          </span>
        </div>

        <div className="
          flex
          items-center
          gap-2
        ">
          <DollarSign size={16} />

          <span>
            R$ {cliente.total_spent}
          </span>
        </div>

        <div>
          Status:
          {" "}
          <strong>
            {cliente.lead_status}
          </strong>
        </div>
      </div>
    </div>
  );
}