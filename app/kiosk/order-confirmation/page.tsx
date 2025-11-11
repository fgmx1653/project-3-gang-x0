import OrderConfirmationClient from '@/app/kiosk/order-confirmation/OrderConfirmationClient';

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

// Server component: receives searchParams at render time and passes the encoded data to the client.
export default function Page({ searchParams }: Props) {
  const raw = Array.isArray(searchParams?.data) ? searchParams?.data[0] : searchParams?.data;
  // pass through the encoded string (or null) to the client component
  const encodedData = raw ?? null;

  return <OrderConfirmationClient encodedData={encodedData} />;
}