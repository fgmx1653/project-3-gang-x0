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

async function getEmployees() {
  try {
    const result = await pool.query("SELECT * FROM employees;");
    return result.rows;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
}

export default async function Home() {
  const employees = await getEmployees();

  return (
    <h1>Gang_x0 stuff</h1>
  );
}