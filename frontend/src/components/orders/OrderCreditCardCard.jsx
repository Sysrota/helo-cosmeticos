import {
  useEffect,
  useRef,
  useState,
} from "react";

import Formatter
  from "../../utils/Formatter";

const API_URL =
  import.meta.env
    .VITE_API_URL;

function formatMoney(value) {
  return Number(
    value || 0
  ).toLocaleString(
    "pt-BR",
    {
      style:
        "currency",
      currency:
        "BRL",
    }
  );
}

function extractInstallmentTotal(
  label
) {
  const amounts =
    Array.from(
      String(label || "")
        .matchAll(
          /R\$\s*([\d.]+,\d{2})/g
        )
    ).map(
      (result) =>
        Number(
          result[1]
            .replace(/\./g, "")
            .replace(",", ".")
        )
    );

  if (!amounts.length) {
    return null;
  }

  return amounts[
    amounts.length - 1
  ];
}

export function OrderCreditCardCard({
  order,
  initialCustomer,
}) {

  const mpRef =
    useRef(null);

  // =========================
  // STATES
  // =========================

  const [loading,
    setLoading] =
    useState(false);

  const [errors,
    setErrors] =
    useState({});

  const [paymentMessage,
    setPaymentMessage] =
    useState(null);

  const [paymentStatus,
    setPaymentStatus] =
    useState(null);

  const [paymentReason,
    setPaymentReason] =
    useState(null);

  const [cardBrand,
    setCardBrand] =
    useState(null);

  const [cardFieldsReady,
    setCardFieldsReady] =
    useState(false);

  const [cardSetupError,
    setCardSetupError] =
    useState(null);

  const [installmentPlans,
    setInstallmentPlans] =
    useState([]);

  const [selectedInstallments,
    setSelectedInstallments] =
    useState("");

  const [formData,
    setFormData] =
    useState({

      cardholderName: "",
      cardholderEmail:
        initialCustomer?.email || "",
      identificationNumber:
        Formatter.cpfCnpj(
          initialCustomer?.cpf || ""
        ),
    });

  const bestInterestFreePlan =
    installmentPlans
      .filter(
        (plan) =>
          plan.interestFree &&
          plan.installments > 1
      )
      .sort(
        (first, second) =>
          second.installments -
          first.installments
      )[0];

  useEffect(() => {

    setFormData((previous) => ({
      ...previous,
      cardholderEmail:
        previous.cardholderEmail ||
        initialCustomer?.email ||
        "",
      identificationNumber:
        previous.identificationNumber ||
        Formatter.cpfCnpj(
          initialCustomer?.cpf || ""
        ),
    }));

  }, [
    initialCustomer?.cpf,
    initialCustomer?.email,
  ]);

  // =========================
  // HELPERS
  // =========================

  function setFieldError(
    field,
    message
  ) {

    setErrors((old) => {

      const updated = {
        ...old,
      };

      if (message) {

        updated[field] =
          message;

      } else {

        delete updated[field];
      }

      return updated;
    });
  }

  function clearGlobalError() {

    setPaymentMessage(
      null
    );

    setPaymentStatus(
      null
    );

    setPaymentReason(
      null
    );
  }

  // =========================
  // CPF VALIDATION
  // =========================

  function isValidCPF(
    cpf
  ) {

    cpf =
      cpf.replace(/\D/g, "");

    if (
      cpf.length !== 11 ||
      /^(\d)\1+$/.test(cpf)
    ) {

      return false;
    }

    let sum = 0;

    for (
      let i = 0;
      i < 9;
      i++
    ) {

      sum +=
        parseInt(cpf.charAt(i)) *
        (10 - i);
    }

    let rest =
      (sum * 10) % 11;

    if (
      rest === 10 ||
      rest === 11
    ) {

      rest = 0;
    }

    if (
      rest !==
      parseInt(cpf.charAt(9))
    ) {

      return false;
    }

    sum = 0;

    for (
      let i = 0;
      i < 10;
      i++
    ) {

      sum +=
        parseInt(cpf.charAt(i)) *
        (11 - i);
    }

    rest =
      (sum * 10) % 11;

    if (
      rest === 10 ||
      rest === 11
    ) {

      rest = 0;
    }

    return (
      rest ===
      parseInt(cpf.charAt(10))
    );
  }

  // =========================
  // ERROR TRANSLATION
  // =========================

  function translateMercadoPagoError(
    error
  ) {

    const message =
      String(
        error || ""
      ).toLowerCase();

    // DOCUMENT
    if (

      message.includes(
        "identificationnumber"
      ) ||

      message.includes(
        "324"
      )

    ) {

      return {

        title:
          "CPF/CNPJ inválido",

        reason:
          "O documento informado é inválido, incompleto ou não pertence ao titular do cartão.",
      };
    }

    // CARD
    if (
      message.includes(
        "card number"
      )
    ) {

      return {

        title:
          "Cartão inválido",

        reason:
          "O número do cartão informado é inválido.",
      };
    }

    // CVV
    if (

      message.includes(
        "security code"
      ) ||

      message.includes(
        "cvv"
      )

    ) {

      return {

        title:
          "CVV inválido",

        reason:
          "O código de segurança do cartão está incorreto.",
      };
    }

    // EXP
    if (
      message.includes(
        "expiration"
      )
    ) {

      return {

        title:
          "Cartão expirado",

        reason:
          "A validade do cartão é inválida ou o cartão expirou.",
      };
    }

    // LIMIT
    if (
      message.includes(
        "insufficient"
      )
    ) {

      return {

        title:
          "Saldo insuficiente",

        reason:
          "O cartão não possui limite suficiente para concluir a compra.",
      };
    }

    // REJECTED
    if (
      message.includes(
        "rejected"
      )
    ) {

      return {

        title:
          "Pagamento recusado",

        reason:
          "O banco emissor recusou a transação.",
      };
    }

    // TOKEN
    if (
      message.includes(
        "token"
      )
    ) {

      return {

        title:
          "Sessão expirada",

        reason:
          "Os dados do cartão expiraram. Atualize a página e tente novamente.",
      };
    }

    // INSTALLMENTS
    if (
      message.includes(
        "installments"
      )
    ) {

      return {

        title:
          "Parcelamento inválido",

        reason:
          "A quantidade de parcelas selecionada não é permitida.",
      };
    }

    // DEFAULT
    return {

      title:
        "Erro ao processar pagamento",

      reason:
        String(error),
    };
  }

  // =========================
  // VALIDATIONS
  // =========================

  function validateField(
    field,
    value
  ) {

    let error = null;

    // NAME
    if (
      field ===
      "cardholderName"
    ) {

      if (
        !value ||
        value.trim().length < 3
      ) {

        error =
          "Digite o nome completo";
      }
    }

    // EMAIL
    if (
      field ===
      "cardholderEmail"
    ) {

      const validEmail =
        /\S+@\S+\.\S+/
          .test(value);

      if (
        !validEmail
      ) {

        error =
          "Digite um e-mail válido";
      }
    }

    // DOCUMENT
    if (
      field ===
      "identificationNumber"
    ) {

      const numbers =
        Formatter.onlyNumbers(
          value
        );

      if (
        numbers.length <= 11
      ) {

        if (
          !isValidCPF(
            numbers
          )
        ) {

          error =
            "CPF inválido";
        }

      } else {

        if (
          numbers.length !== 14
        ) {

          error =
            "CNPJ inválido";
        }
      }
    }

    setFieldError(
      field,
      error
    );

    return !error;
  }

  // =========================
  // VALIDATE MP
  // =========================

  function validateMercadoPagoFields() {

    if (!mpRef.current) {
      return false;
    }

    const data =
      mpRef.current
        .getCardFormData();

    let hasError =
      false;

    // CARD
    if (
      !data.paymentMethodId
    ) {

      setFieldError(
        "cardNumber",
        "Número do cartão inválido"
      );

      hasError =
        true;

    } else {

      setFieldError(
        "cardNumber",
        null
      );
    }

    // BRAND
    if (
      data.paymentMethodId
    ) {

      setCardBrand(
        data.paymentMethodId
          .toUpperCase()
      );

    } else {

      setCardBrand(
        null
      );
    }

    // EXP
    const monthRaw =
      String(
        data.expirationMonth ||
        ""
      );

    const yearRaw =
      String(
        data.expirationYear ||
        ""
      );

    if (
      monthRaw.length >= 1 &&
      yearRaw.length >= 2
    ) {

      const month =
        Number(monthRaw);

      const year =
        Number(yearRaw);

      const currentDate =
        new Date();

      const currentMonth =
        currentDate.getMonth() + 1;

      const currentYear =
        currentDate
          .getFullYear();

      const hasValidDate =

        month >= 1 &&
        month <= 12 &&
        year >= currentYear &&
        !(
          year === currentYear &&
          month < currentMonth
        );

      if (!hasValidDate) {

        setFieldError(
          "expirationDate",
          "Data inválida"
        );

        hasError =
          true;

      } else {

        setFieldError(
          "expirationDate",
          null
        );
      }
    }

    // CVV
    const cvv =
      String(
        data.securityCode ||
        ""
      );

    if (
      cvv.length > 0
    ) {

      const isAmex =
        data.paymentMethodId ===
        "amex";

      const validCvv =
        isAmex

          ? cvv.length === 4

          : cvv.length >= 3;

      if (!validCvv) {

        setFieldError(
          "securityCode",
          "CVV inválido"
        );

        hasError =
          true;

      } else {

        setFieldError(
          "securityCode",
          null
        );
      }
    }

    return !hasError;
  }

  // =========================
  // INIT MP
  // =========================

  useEffect(() => {

    let active =
      true;

    let cardForm =
      null;

    let installmentsObserver =
      null;

    let installmentsInterval =
      null;

    let paymentFormElement =
      null;

    let installmentPlansSignature =
      "";

    setCardFieldsReady(
      false
    );

    setCardSetupError(
      null
    );

    setInstallmentPlans(
      []
    );

    setSelectedInstallments(
      ""
    );

    function syncInstallmentPlans() {

      const installmentsElement =
        document.getElementById(
          "form-checkout__installments"
        );

      if (
        !installmentsElement
      ) {
        return;
      }

      const rawPlans =
        Array.from(
          installmentsElement
            .options || []
        )
          .filter(
            (option) =>
              /parcela/i.test(
                String(
                  option.textContent || ""
                )
              )
          )
          .map(
            (option, index) => {

              const label =
                String(
                  option.textContent || ""
                )
                  .replace(
                    /\s*-\s*sem juros$/i,
                    ""
                  )
                  .trim();

              const installments =
                Number(
                  option.value
                ) ||
                Number(
                  label.match(
                    /^(\d+)\s+parcela/i
                  )?.[1] || 0
                );

              return {
                value:
                  String(
                    option.value ||
                    installments ||
                    index + 1
                  ),
                installments:
                  installments,
                label,
                chargedTotal:
                  extractInstallmentTotal(
                    label
                  ),
              };
            }
          );

      const referenceTotal =
        rawPlans.find(
          (plan) =>
            plan.installments === 1
        )?.chargedTotal ??
        Number(
          order.total || 0
        );

      const plans =
        rawPlans.map(
          (plan) => {

            const interestFree =
              plan.chargedTotal !== null &&
              Math.abs(
                plan.chargedTotal -
                referenceTotal
              ) < 0.01;

            const cleanLabel =
              plan.label
                .trim();

            const displayedLabel =
              interestFree &&
              plan.installments > 1
                ? `${cleanLabel} - sem juros`
                : cleanLabel;

            return {
              value:
                plan.value,
              installments:
                plan.installments,
              label:
                cleanLabel,
              displayLabel:
                displayedLabel,
              interestFree,
            };
          }
        );

      const nextSignature =
        JSON.stringify(
          plans
        );

      if (
        nextSignature !==
        installmentPlansSignature
      ) {
        installmentPlansSignature =
          nextSignature;
        setInstallmentPlans(
          plans
        );
        setSelectedInstallments(
          String(
            installmentsElement
              .value ||
            plans[0]?.value ||
            ""
          )
        );
      }
    }

    if (!window.mp) {

      setCardSetupError(
        "Não foi possível carregar os campos seguros do cartão. Atualize a página e tente novamente."
      );

      return;
    }

    try {

      cardForm =
        window.mp.cardForm({

          amount:
            String(
              Number(
                order.total || 0
              )
            ),

          iframe: true,

          form: {

            id:
              "form-checkout",

            cardNumber: {

              id:
                "form-checkout__cardNumber",

              placeholder:
                "Número do cartão",
            },

            expirationDate: {

              id:
                "form-checkout__expirationDate",

              placeholder:
                "MM/AA",
            },

            securityCode: {

              id:
                "form-checkout__securityCode",

              placeholder:
                "CVV",
            },

            cardholderName: {

              id:
                "form-checkout__cardholderName",

              placeholder:
                "Nome no cartão",
            },

            cardholderEmail: {

              id:
                "form-checkout__cardholderEmail",

              placeholder:
                "E-mail",
            },

            identificationType: {

              id:
                "form-checkout__identificationType",
            },

            identificationNumber: {

              id:
                "form-checkout__identificationNumber",

              placeholder:
                "CPF ou CNPJ",
            },

            issuer: {

              id:
                "form-checkout__issuer",
            },

            installments: {

              id:
                "form-checkout__installments",
            },
          },

          callbacks: {

            onFormMounted:
              (error) => {

                if (!active) {
                  return;
                }

                if (error) {

                  setCardSetupError(
                    "Não foi possível habilitar os campos do cartão. Atualize a página e tente novamente."
                  );

                  return;
                }

                setCardFieldsReady(
                  true
                );

                paymentFormElement =
                  document.getElementById(
                    "form-checkout"
                  );

                if (
                  paymentFormElement
                ) {

                  installmentsObserver =
                    new MutationObserver(
                      syncInstallmentPlans
                    );

                  installmentsObserver
                    .observe(
                      paymentFormElement,
                      {
                        childList:
                          true,
                        subtree:
                          true,
                        characterData:
                          true,
                      }
                    );

                  paymentFormElement
                    .addEventListener(
                      "change",
                      syncInstallmentPlans
                    );

                  syncInstallmentPlans();

                  installmentsInterval =
                    window.setInterval(
                      syncInstallmentPlans,
                      400
                    );
                }
              },

            onValidityChange:
              () => {

                if (
                  !active ||
                  !mpRef.current
                ) {
                  return;
                }

                const data =
                  mpRef.current
                    .getCardFormData();

                setCardBrand(
                  data.paymentMethodId
                    ? data.paymentMethodId
                        .toUpperCase()
                    : null
                );
              },
          },
        });

      mpRef.current =
        cardForm;

    } catch {

      setCardSetupError(
        "Não foi possível habilitar os campos do cartão. Atualize a página e tente novamente."
      );
    }

    return () => {

      active =
        false;

      mpRef.current =
        null;

      if (
        typeof cardForm?.unmount ===
        "function"
      ) {

        cardForm.unmount();
      }

      installmentsObserver
        ?.disconnect();

      if (
        installmentsInterval
      ) {
        window.clearInterval(
          installmentsInterval
        );
      }

      paymentFormElement
        ?.removeEventListener(
          "change",
          syncInstallmentPlans
        );
    };

  }, [order.id, order.total]);

  function handleInstallmentChange(
    value
  ) {

    const installmentsElement =
      document.getElementById(
        "form-checkout__installments"
      );

    setSelectedInstallments(
      value
    );

    if (
      installmentsElement
    ) {
      installmentsElement.value =
        value;
      installmentsElement.dispatchEvent(
        new Event(
          "change",
          {
            bubbles:
              true,
          }
        )
      );
    }
  }

  // =========================
  // PAYMENT
  // =========================

  async function handlePayment() {

    try {

      setLoading(true);

      clearGlobalError();

      const validName =
        validateField(

          "cardholderName",

          formData
            .cardholderName
        );

      const validEmail =
        validateField(

          "cardholderEmail",

          formData
            .cardholderEmail
        );

      const validDocument =
        validateField(

          "identificationNumber",

          formData
            .identificationNumber
        );

      const validMpFields =
        validateMercadoPagoFields();

      if (

        !validName ||
        !validEmail ||
        !validDocument ||
        !validMpFields

      ) {

        setPaymentStatus(
          "error"
        );

        setPaymentMessage(
          "Corrija os campos inválidos"
        );

        setPaymentReason(
          "Verifique os dados preenchidos antes de continuar."
        );

        return;
      }

      // DATA
      const data =
        mpRef.current
          .getCardFormData();

      // TOKEN
      const tokenizedCard =
        await mpRef.current
          .createCardToken();

      // NAME
      const fullName =
        formData
          .cardholderName
          .trim();

      const names =
        fullName
          .split(" ");

      // REQUEST
      const response =
        await fetch(

          `${API_URL}/payment/card`,

          {
            method: "POST",

            headers: {

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                order_id:
                  order.id,

                token:
                  tokenizedCard.token,

                payment_method_id:
                  data.paymentMethodId,

                transaction_amount:
                  Number(
                    order.total
                  ),

                installments:
                  Number(
                    data.installments
                  ),

                payer: {

                  email:
                    formData.cardholderEmail,

                  first_name:
                    names[0],

                  last_name:
                    names
                      .slice(1)
                      .join(" "),

                  identification: {

                    type:

                      Formatter.onlyNumbers(
                        formData
                          .identificationNumber
                      ).length > 11

                        ? "CNPJ"

                        : "CPF",

                    number:
                      String(
                        Formatter.onlyNumbers(
                          formData
                            .identificationNumber
                        )
                      ),
                  },
                },
              }),
          }
        );

      const payment =
        await response.json();

      // API ERROR
      if (!response.ok) {

        const apiError =

          payment?.message ||

          payment?.error ||

          payment?.cause?.[0]
            ?.description ||

          payment?.cause?.[0]
            ?.message ||

          payment?.[0]
            ?.message ||

          "Erro ao processar pagamento";

        const translated =
          translateMercadoPagoError(
            apiError
          );

        setPaymentStatus(
          "error"
        );

        setPaymentMessage(
          translated.title
        );

        setPaymentReason(
          translated.reason
        );

        return;
      }

      // SUCCESS
      if (
        payment.status ===
        "approved"
      ) {

        setPaymentStatus(
          "success"
        );

        setPaymentMessage(
          "Pagamento aprovado 🎉"
        );

        setPaymentReason(
          "Seu pagamento foi confirmado com sucesso."
        );

      } else if (

        payment.status ===
        "rejected"

      ) {

        setPaymentStatus(
          "error"
        );

        setPaymentMessage(
          "Pagamento recusado"
        );

        setPaymentReason(
          "O banco emissor recusou a transação."
        );

      } else {

        setPaymentStatus(
          "warning"
        );

        setPaymentMessage(
          "Pagamento pendente"
        );

        setPaymentReason(
          "Seu pagamento está em análise."
        );
      }

    } catch (error) {

      let rawError = "";

      // ARRAY
      if (
        Array.isArray(error)
      ) {

        rawError =

          error?.[0]
            ?.message ||

          error?.[0]
            ?.description ||

          JSON.stringify(error);

      // OBJECT
      } else if (
        typeof error ===
        "object"
      ) {

        rawError =

          error?.message ||

          error?.cause?.[0]
            ?.description ||

          error?.cause?.[0]
            ?.message ||

          JSON.stringify(error);

      // STRING
      } else {

        rawError =
          String(error);
      }

      const translated =
        translateMercadoPagoError(
          rawError
        );

      setPaymentStatus(
        "error"
      );

      setPaymentMessage(
        translated.title
      );

      setPaymentReason(
        translated.reason
      );

    } finally {

      setLoading(false);
    }
  }

  return (
    <div className="
      bg-white
      border
      border-[#eee2e6]
      rounded-[22px]
      p-5
      shadow-sm
    ">

      {/* HEADER */}
      <div className="
        mb-6
      ">

        <div className="
          flex
          items-center
          justify-between
          gap-4
        ">

          <div>

            <h2 className="
              text-lg
              font-semibold
              text-[#43232d]
            ">
              Cartão de Crédito
            </h2>

            <p className="
              text-sm
              text-zinc-500
              mt-1
            ">
              Pagamento seguro
              via Mercado Pago
            </p>
          </div>

          {cardBrand && (

            <div className="
              h-10
              px-4
              rounded-xl
              bg-zinc-100
              border
              border-zinc-200
              flex
              items-center
              justify-center
              text-xs
              font-bold
              uppercase
              tracking-wide
              text-zinc-700
            ">

              {cardBrand}

            </div>
          )}
        </div>
      </div>

      {/* ALERT */}
      {paymentMessage && (

        <div className={`
          mb-5
          rounded-2xl
          p-4
          text-sm
          font-medium

          ${
            paymentStatus ===
            "success"

              ? `
                bg-green-50
                text-green-700
                border
                border-green-200
              `

              : paymentStatus ===
                "error"

                ? `
                  bg-red-50
                  text-red-700
                  border
                  border-red-200
                `

                : `
                  bg-yellow-50
                  text-yellow-700
                  border
                  border-yellow-200
                `
          }
        `}>

          <div className="
            font-semibold
            text-base
          ">
            {paymentMessage}
          </div>

          {paymentReason && (

            <div className="
              mt-2
              text-sm
              opacity-90
            ">
              {paymentReason}
            </div>
          )}
        </div>
      )}

      {/* FORM */}
      {cardSetupError && (
        <div className="
          mb-5
          rounded-2xl
          border
          border-red-100
          bg-red-50
          px-4
          py-3
          text-sm
          text-red-700
        ">
          {cardSetupError}
        </div>
      )}

      <form
        id="form-checkout"

        className="
          flex
          flex-col
          gap-5
        "
      >

        {/* CARD */}
        <div>

          <div className="
            flex
            items-center
            justify-between
            mb-2
          ">

            <label className="
              text-sm
              font-medium
              text-zinc-700
            ">
              Número do cartão
            </label>

            {cardBrand && (

              <div className="
                text-xs
                font-semibold
                text-sky-600
              ">
                {cardBrand}
              </div>
            )}
          </div>

          <div className="
            h-[58px]
            border
            border-zinc-200
            rounded-2xl
            px-4
            flex
            items-center
            bg-white
            overflow-hidden

            focus-within:border-sky-500
            focus-within:ring-4
            focus-within:ring-sky-100
          ">

            <div
              id="form-checkout__cardNumber"

              className="
                h-full
                w-full
                [&>iframe]:h-full
                [&>iframe]:w-full
                [&>iframe]:border-0
              "
            />
          </div>
          {errors.cardNumber && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.cardNumber}
            </p>
          )}
        </div>

        {/* ROW */}
        <div className="
          grid
          grid-cols-2
          gap-4
        ">

          {/* EXP */}
          <div>

            <label className="
              text-sm
              font-medium
              text-zinc-700
              block
              mb-2
            ">
              Validade
            </label>

            <div className="
              h-[58px]
              border
              border-zinc-200
              rounded-2xl
              px-4
              flex
              items-center
              bg-white
              overflow-hidden

              focus-within:border-sky-500
              focus-within:ring-4
              focus-within:ring-sky-100
            ">

              <div
                id="form-checkout__expirationDate"

                className="
                  h-full
                  w-full
                  [&>iframe]:h-full
                  [&>iframe]:w-full
                  [&>iframe]:border-0
                "
              />
            </div>
            {errors.expirationDate && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.expirationDate}
              </p>
            )}
          </div>

          {/* CVV */}
          <div>

            <label className="
              text-sm
              font-medium
              text-zinc-700
              block
              mb-2
            ">
              CVV
            </label>

            <div className="
              h-[58px]
              border
              border-zinc-200
              rounded-2xl
              px-4
              flex
              items-center
              bg-white
              overflow-hidden

              focus-within:border-sky-500
              focus-within:ring-4
              focus-within:ring-sky-100
            ">

              <div
                id="form-checkout__securityCode"

                className="
                  h-full
                  w-full
                  [&>iframe]:h-full
                  [&>iframe]:w-full
                  [&>iframe]:border-0
                "
              />
            </div>
            {errors.securityCode && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.securityCode}
              </p>
            )}
          </div>
        </div>

        {/* NAME */}
        <div>

          <label className="
            text-sm
            font-medium
            text-zinc-700
            block
            mb-2
          ">
            Nome impresso
          </label>

          <input
            id="form-checkout__cardholderName"

            value={
              formData
                .cardholderName
            }

            onChange={(e) => {

              const value =
                e.target.value;

              setFormData(
                (old) => ({

                  ...old,

                  cardholderName:
                    value,
                }))
              ;

              validateField(
                "cardholderName",
                value
              );
            }}

            placeholder="
              Nome no cartão
            "

            className="
              w-full
              h-[58px]
              border
              border-zinc-200
              rounded-2xl
              px-4
              outline-none
              bg-white

              focus:border-sky-500
              focus:ring-4
              focus:ring-sky-100
            "
          />
          {errors.cardholderName && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.cardholderName}
            </p>
          )}
        </div>

        {/* EMAIL */}
        <div>

          <label className="
            text-sm
            font-medium
            text-zinc-700
            block
            mb-2
          ">
            E-mail
          </label>

          <input
            id="form-checkout__cardholderEmail"

            value={
              formData
                .cardholderEmail
            }

            onChange={(e) => {

              const value =
                e.target.value;

              setFormData(
                (old) => ({

                  ...old,

                  cardholderEmail:
                    value,
                }))
              ;

              validateField(
                "cardholderEmail",
                value
              );
            }}

            placeholder="
              cliente@email.com
            "

            className="
              w-full
              h-[58px]
              border
              border-zinc-200
              rounded-2xl
              px-4
              outline-none
              bg-white

              focus:border-sky-500
              focus:ring-4
              focus:ring-sky-100
            "
          />
          {errors.cardholderEmail && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.cardholderEmail}
            </p>
          )}
        </div>

        {/* DOCUMENT */}
        <div>

          <label className="
            text-sm
            font-medium
            text-zinc-700
            block
            mb-2
          ">
            CPF/CNPJ
          </label>

          <input
            id="form-checkout__identificationNumber"

            value={
              formData
                .identificationNumber
            }

            onChange={(e) => {

              const formatted =
                Formatter.cpfCnpj(
                  e.target.value
                );

              setFormData(
                (old) => ({

                  ...old,

                  identificationNumber:
                    formatted,
                }))
              ;

              validateField(
                "identificationNumber",
                formatted
              );
            }}

            placeholder="
              CPF ou CNPJ
            "

            className="
              w-full
              h-[58px]
              border
              border-zinc-200
              rounded-2xl
              px-4
              outline-none
              bg-white

              focus:border-sky-500
              focus:ring-4
              focus:ring-sky-100
            "
          />
          {errors.identificationNumber && (
            <p className="mt-1.5 text-xs text-red-600">
              {errors.identificationNumber}
            </p>
          )}
        </div>

        {/* INSTALLMENTS */}
        <div>

          <label className="
            text-sm
            font-medium
            text-zinc-700
            block
            mb-2
          ">
            Parcelamento
          </label>

          {installmentPlans.length > 0 && (
            <select
              value={selectedInstallments}
              onChange={(event) =>
                handleInstallmentChange(
                  event.target.value
                )
              }
              className="
                w-full
                h-[58px]
                border
                border-zinc-200
                rounded-2xl
                px-4
                outline-none
                bg-white

                focus:border-sky-500
                focus:ring-4
                focus:ring-sky-100
              "
              aria-label="Parcelamento disponível"
            >
              {installmentPlans.map((plan) => (
                <option
                  key={plan.value}
                  value={plan.value}
                >
                  {plan.displayLabel}
                </option>
              ))}
            </select>
          )}

          <select
            id="form-checkout__installments"
            className={`
              w-full
              h-[58px]
              border
              border-zinc-200
              rounded-2xl
              px-4
              outline-none
              bg-white

              focus:border-sky-500
              focus:ring-4
              focus:ring-sky-100

              ${installmentPlans.length > 0 ? "hidden" : ""}
            `}
          />
          {bestInterestFreePlan ? (
            <div className="
              mt-3
              rounded-xl
              border
              border-emerald-100
              bg-emerald-50
              px-4
              py-3
              text-sm
              text-emerald-700
            ">
              <p className="font-semibold">
                Até {bestInterestFreePlan.installments}x sem juros neste cartão
              </p>
              <p className="mt-1 text-xs">
                {bestInterestFreePlan.displayLabel}
              </p>
            </div>
          ) : (
            <p className="
              mt-2
              text-xs
              leading-5
              text-zinc-500
            ">
              {installmentPlans.length
                ? "Parcelas disponíveis conforme as condições do seu cartão."
                : `Informe o cartão para consultar parcelamento sem juros sobre ${formatMoney(order.total)}.`}
            </p>
          )}
        </div>

        {/* HIDDEN */}
        <div className="
          hidden
        ">

          <select
            id="form-checkout__issuer"
          />

          <select
            id="form-checkout__identificationType"

            value={
              Formatter.onlyNumbers(
                formData
                  .identificationNumber
              ).length > 11

                ? "CNPJ"

                : "CPF"
            }

            readOnly
          >

            <option value="CPF">
              CPF
            </option>

            <option value="CNPJ">
              CNPJ
            </option>

          </select>
        </div>

        {/* BUTTON */}
        <button
          type="button"

          disabled={
            loading ||
            !cardFieldsReady
          }

          onClick={
            handlePayment
          }

          className="
            w-full
            h-[58px]

            bg-[#d85c7a]
            hover:bg-[#c9506d]

            disabled:opacity-50
            disabled:cursor-not-allowed

            text-white

            rounded-2xl

            font-semibold

            transition-all

            hover:scale-[1.01]
            active:scale-[0.99]
          "
        >
          {
            loading

              ? "Processando pagamento..."

              : cardFieldsReady

                ? "Pagar com cartão"

                : "Carregando campos seguros..."
          }
        </button>
      </form>
    </div>
  );
}
