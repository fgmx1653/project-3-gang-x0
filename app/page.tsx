import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
import Link from 'next/link';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"





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
    <div className='flex h-screen flex-col items-center justify-center gap-4'>
      <div className='flex flex-row gap-4 items-center'>
        <img src="/logo.png" alt="Boba Shop Logo" width={50} />
        <h1 className='font-bold text-xl font-mono'>gang_x0 dev portal</h1>
      </div>
      <div className='flex flex-row gap-4'>
        <Link href='/menu'><Button>Menu Display</Button></Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href=''><Button>Customer Kiosk</Button></Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>Yet to be implemented</p>
          </TooltipContent>
        </Tooltip>
        <Link href='/login'><Button>Employee Login</Button></Link>
      </div>
    </div>
  );
}