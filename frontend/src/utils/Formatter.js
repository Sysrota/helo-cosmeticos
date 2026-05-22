  // src/utils/Formatter.js
  export default class Formatter {
    // Remove tudo que não é número
    static onlyNumbers(value) {
      if (!value) return ""; // <-- evita erro se value for undefined ou null
      return value.replace(/\D/g, '');
    }

    // Mascara CPF ou CNPJ
    static cpfCnpj(value) {
      let v = Formatter.onlyNumbers(value);
      if (v.length <= 11) {
        // CPF
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d)/, '$1.$2');
        v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
      } else {
        // CNPJ
        v = v.replace(/^(\d{2})(\d)/, '$1.$2');
        v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
      }
      return v;
    }

    static cep(value) {
      let v = Formatter.onlyNumbers(value);
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
      return v;
    }

    static telefone(value) {
      let v = Formatter.onlyNumbers(value);
      if (v.length <= 10) {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        v = v.replace(/(\d{2})(\d)/, '($1) $2');
        v = v.replace(/(\d{1})(\d{4})(\d)/, '$1 $2-$3');
      }
      return v;
    }

    // Data (dd/mm/yyyy)
    static data(value) {
      if (!value) return "";

      // Garante que nunca entre no bug do timezone
      const d = new Date(value + "T00:00:00");

      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();

      return `${dia}/${mes}/${ano}`;
    }


      // src/utils/Formatter.js
      static mascaraMoeda(cents) {
        if (cents === undefined || cents === null) return "R$ 0,00";
        return (cents / 100).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      }

      static formataMoeda(value, fromCents = false) {
        if (value === undefined || value === null) return "R$ 0,00";

        // Converte para number se for Decimal ou string
        const num = typeof value === "number" ? value : parseFloat(value.toString().replace(',', '.'));

        // Divide só se vier em centavos
        const reais = fromCents ? num / 100 : num;

        return reais.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      }


        // ---- FORMATAR PARA EXIBIÇÃO NO INPUT (com vírgula) ----
      static mascaraMoedaVindoDoBanco(cents) {
        console.log(cents);

        if (cents === null || cents === undefined) return "R$ 0,00";

        let valor = String(cents).trim();

        let numero;

        if (valor.includes(".")) {
          //já tem centavos (ex: 600.01)
          numero = Number(valor);
        } else {
          // é inteiro (ex: 600) → vira 600.00
          numero = Number(valor);
        }

        if (isNaN(numero)) return "R$ 0,00";

        return numero.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });
      }

    static mascaraMoedaInput(cents) {
        // sempre recebe number ou string, nunca undefined
        let v = String(cents).replace(/\D/g, "");

        // permite zero
        if (v === "") return "R$ 0,00";

        // garante 2 dígitos
        v = v.padStart(3, "0");

        const reais = v.slice(0, -2);
        const centavos = v.slice(-2);

        const retorno = `R$ ${Number(reais).toLocaleString("pt-BR")},${centavos}`;

        return retorno;

      }




      // ---- REMOVER FORMATAÇÃO E DEVOLVER STRING NÚMERICA LIMPA ----
      static parseMoedaToNumberString(value) {
        if (!value) return "0.00";

        return String(value)
          .replace(/[^\d,]/g, "")       // remove R$, espaço, pontos
          .replace(/\./g, "")           // remove pontos de milhar
          .replace(",", ".");           // vira decimal no padrão JS
      }


      static parseMoedaToNumber(value) {
        if (!value) return null;

        // Remove R$, espaços e tudo que não seja número ou vírgula
        let v = String(value)
          .replace("R$", "")
          .replace(/\s/g, "")
          .replace(/\./g, "")
          .replace(",", ".");

        const n = Number(v);

        return isNaN(n) ? null : n;
      }



      static data_banco(value) {
        if (!value) return "-";

        // Extrai somente YYYY-MM-DD
        const onlyDate = value.split("T")[0];
        const [ano, mes, dia] = onlyDate.split("-");

        return `${dia}/${mes}/${ano}`;
      }



      // Bloqueia digitação que não seja número
      static somenteNumeros(e) {
        const allowed = [
          "Backspace",
          "Delete",
          "ArrowLeft",
          "ArrowRight",
          "Tab",
        ];

        // Números são permitidos
        if (/[0-9]/.test(e.key)) return;

        // Teclas especiais permitidas
        if (allowed.includes(e.key)) return;

        // Toda outra tecla é bloqueada
        e.preventDefault();
      }

      static limpaMoeda(value) {
        if (value === "" || value === null || value === undefined) return 0;
        const somenteNumeros = value.toString().replace(/\D/g, "");
        return Number(somenteNumeros) / 100;
      }

      static formataValorBanco(value) {
        if (value === null || value === undefined) return 0;

        let v = String(value)
          .replace(/[R$\s]/g, "") // remove R$ e espaços
          .replace(/\./g, "")     // remove pontos de milhar
          .replace(",", ".");     // troca vírgula por ponto

        const num = Number(v) /100;

        return isNaN(num) ? 0 : num;
      }



  }
