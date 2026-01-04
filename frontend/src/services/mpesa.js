import api from "./api";

/* -------------------------
   INITIATE PAYMENT
-------------------------- */
export const initiateMpesaPayment = async ({ phone, amount }) => {
  try {
    const response = await api.post("/api/mpesa/pay", {
      phone,
      amount,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
};

/* -------------------------
   OPTIONAL: CHECK PAYMENT STATUS
-------------------------- */
export const checkPaymentStatus = async (checkoutRequestId) => {
  try {
    const response = await api.get(`/api/mpesa/status/${checkoutRequestId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
