import OrderConfirmationClient from '@/app/kiosk/order-confirmation/OrderConfirmationClient';

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

// Server component: receives searchParams at render time and passes the encoded data to the client.
export default async function Page({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const raw = Array.isArray(params?.data) ? params.data[0] : params.data;
  const encodedData = raw ?? null;

  return <OrderConfirmationClient encodedData={encodedData} />;
}