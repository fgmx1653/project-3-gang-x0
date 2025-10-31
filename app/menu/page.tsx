import Image from 'next/image';
import { pool } from '@/lib/db';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"

async function getMenuItems() {
  try {
    const result = await pool.query("SELECT * FROM menu_items;");
    return result.rows;
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return [];
  }
}

export default async function Home() {
  const menuItems = await getMenuItems();

  return (
    <ul>
      {menuItems.map((item) => (
        <li key={item.id}>
          <h2>{item.name}</h2>
          <p>{item.price}</p>
        </li>
      ))}
    </ul>
  );
}