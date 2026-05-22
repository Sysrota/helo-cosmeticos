import { create }
  from "zustand";
import { api } from "../services/api";

interface Cliente {
  id: number;

  name?: string;

  phone: string;

  city?: string;

  state?: string;

  lead_status: string;

  total_spent: number;

  priority: boolean;

  blocked_ai: boolean;
}

interface State {
  clientes: Cliente[];

  loading: boolean;

  fetchClientes: () => Promise<void>;
}

export const useClientesStore =
  create<State>((set) => ({

    clientes: [],

    loading: false,

    fetchClientes:
      async () => {

        try {

          set({
            loading: true,
          });

          const { data } =
            await api.get(
              "/contacts"
            );

          set({
            clientes: data,
          });

        } finally {

          set({
            loading: false,
          });
        }
      },
  }));