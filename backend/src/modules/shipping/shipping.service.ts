import axios from "axios";

interface ShippingResponse {
  price: number;
  deadline: string;
}

export async function calculateShipping(
  cep: string
): Promise<ShippingResponse> {

  // MOCK INICIAL
  // depois vamos integrar Melhor Envio

  const cleanCep =
    cep.replace(/\D/g, "");

  if (
    cleanCep.length !== 8
  ) {
    throw new Error(
      "CEP inválido"
    );
  }

  // CONSULTA CEP
  const { data } =
    await axios.get(
      `https://viacep.com.br/ws/${cleanCep}/json/`
    );

  if (data.erro) {
    throw new Error(
      "CEP não encontrado"
    );
  }

  // SIMULAÇÃO INICIAL
  let price = 19.90;

  let deadline =
    "3 a 5 dias úteis";

  // REGRA EXEMPLO
  if (
    data.uf === "SP"
  ) {

    price = 12.90;

    deadline =
      "1 a 2 dias úteis";
  }

  return {
    price,
    deadline,
  };
}