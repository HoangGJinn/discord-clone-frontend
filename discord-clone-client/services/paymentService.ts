import apiClient from '@/api/client';

export interface CreatePaymentResponse {
  url: string;
}

export interface PaymentConfirmResponse {
  RspCode: string;
  Message: string;
}

export const MOBILE_VNPAY_RETURN_PREFIX = 'https://hoanggjinn.discord/payment-callback';
export const NITRO_PRICE_VND = 200000;

const buildAuthHeaders = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

export const createNitroPayment = async (
  amount = NITRO_PRICE_VND,
  token?: string,
): Promise<CreatePaymentResponse> => {
  const response = await apiClient.post<CreatePaymentResponse>(
    `/payment/nitro/create?amount=${amount}`,
    undefined,
    { headers: buildAuthHeaders(token) },
  );

  return response.data;
};

export const confirmMobilePayment = async (
  callbackParams: Record<string, string>,
  token?: string,
): Promise<PaymentConfirmResponse> => {
  try {
    const response = await apiClient.post<PaymentConfirmResponse>(
      '/payment/nitro/confirm-mobile',
      callbackParams,
      { headers: buildAuthHeaders(token) },
    );

    return response.data;
  } catch (error: any) {
    const status = error?.status ?? error?.response?.status;
    if (status === 403) {
      const response = await apiClient.get<PaymentConfirmResponse>('/payment/vnpay-ipn', {
        params: callbackParams,
      });

      return response.data;
    }

    throw error;
  }
};

export const extractVnpParamsFromUrl = (url: string): Record<string, string> => {
  const parsed = new URL(url);
  const result: Record<string, string> = {};

  parsed.searchParams.forEach((value, key) => {
    if (key.startsWith('vnp_')) {
      result[key] = value;
    }
  });

  return result;
};

export const paymentService = {
  createNitroPayment,
  confirmMobilePayment,
  extractVnpParamsFromUrl,
};

export default paymentService;