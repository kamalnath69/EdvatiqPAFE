import { createWalletRechargeOrder, verifyWalletRecharge } from './workspaceApi';

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Razorpay SDK failed to load.'));
    document.body.appendChild(script);
  });
}

export async function startWalletRecharge({ credits, note, prefill }) {
  await loadRazorpayScript();
  const order = await createWalletRechargeOrder({
    credits,
    note,
  });

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'Edvatiq',
      description: `Wallet recharge: ${order.credits} credits`,
      order_id: order.order_id,
      handler: async (response) => {
        try {
          const summary = await verifyWalletRecharge({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve(summary);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('Recharge cancelled.')),
      },
      prefill: {
        name: prefill?.name || undefined,
        email: prefill?.email || undefined,
      },
      theme: {
        color: '#f5c518',
      },
    });
    rzp.open();
  });
}
