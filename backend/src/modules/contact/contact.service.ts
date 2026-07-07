import { prisma }
  from "../../config/prisma.js";

export async function listContacts() {
  return prisma.contact.findMany({
    orderBy: {
      updated_at: "desc",
    },

    include: {
      conversations: {
        take: 1,

        orderBy: {
          updated_at: "desc",
        },
      },

      addresses: true,

      orders: true,
    },
  });
}


export async function showContact(
   contactId: number
) {

  const contact = await prisma.contact.findUnique({
      where: {
        id: Number(
          contactId
        ),
      },

      include: {
        conversations: true,
        orders: true,
        addresses: true,
      },
    });
  return contact;
}


interface Props {
  id: number;

  name?: string;

  phone?: string;

  email?: string;

  cpf?: string;

  city?: string;

  state?: string;

  birth_date?: string;

  notes?: string;

  lead_status?: string;

  priority?: boolean;

  blocked_ai?: boolean;

  addresses?: {
    street?: string;
    cep?: string;
    city?: string;
    state?: string;
    number?: string;
    complement?: string;
    district?: string;
  }[];
}


interface Address {
  street?: string;

  cep?: string;

  city?: string;

  state?: string;

  number?: string;

  complement?: string;

  district?: string;
}

interface Props {
  id: number;

  name?: string;

  phone?: string;

  email?: string;

  cpf?: string;

  birth_date?: string;

  notes?: string;

  lead_status?: string;

  priority?: boolean;

  blocked_ai?: boolean;

  addresses?: Address[];
}

export async function updateContactService({
  id,
  name,
  phone,
  email,
  cpf,
  birth_date,
  notes,
  lead_status,
  priority,
  blocked_ai,
  addresses,
}: Props) {

  // CLIENTE
  await prisma.contact.update({
    where: {
      id,
    },

    data: {
      name,
      phone,
      email,
      cpf,

      birth_date:
        birth_date
          ? new Date(
              birth_date
            )
          : null,

      notes,

      lead_status,

      priority,

      blocked_ai,
    },
  });

  // PRIMEIRO ENDEREÇO
  const address =
    addresses?.[0];

  if (address) {

    const existingAddress =
      await prisma.contactAddress.findFirst({
        where: {
          contact_id: id,
        },
      });

    // UPDATE
    if (existingAddress) {

      await prisma.contactAddress.update({
        where: {
          id:
            existingAddress.id,
        },

        data: {
          street:
            address.street || "",

          cep:
            address.cep || "",

          city:
            address.city || "",

          state:
            address.state || "",

          number:
            address.number || "",

          complement:
            address.complement || "",

          district:
            address.district || "",
        },
      });

    } else {

      // CREATE
      await prisma.contactAddress.create({
        data: {
          contact_id: id,

          street:
            address.street || "",

          cep:
            address.cep || "",

          city:
            address.city || "",

          state:
            address.state || "",

          number:
            address.number || "",

          complement:
            address.complement || "",

          district:
            address.district || "",
        },
      });
    }
  }

  return prisma.contact.findUnique({
    where: {
      id,
    },

    include: {
      addresses: true,
      conversations: true,
      orders: true,
    },
  });
}
