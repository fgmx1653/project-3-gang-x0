import Image from "next/image";
import ClearCartOnMount from "@/components/ClearCartOnMount";
import { Button } from "@/components/ui/button";
import { pool } from "@/lib/db";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldSet,
} from "@/components/ui/field";
import Link from "next/link";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

async function getEmployees() {
    try {
        const result = await pool.query("SELECT * FROM employees;");
        return result.rows;
    } catch (error) {
        console.error("Error fetching employees:", error);
        return [];
    }
}

export default async function Home() {
    const employees = await getEmployees();

    return (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
            {/* Clear any existing kiosk cart when landing on the home page */}
            <ClearCartOnMount />
            <div className="flex flex-row gap-4 items-center">
                <img src="/logo.png" alt="Boba Shop Logo" width={50} />
                <h1 className="font-bold text-xl font-mono">
                    gang_x0 dev portal
                </h1>
            </div>
            <div className="flex flex-row gap-4">
                <Link href="/menu">
                    <Button className="hover:cursor-pointer">
                        Menu Display
                    </Button>
                </Link>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href="/kiosk">
                            <Button className="hover:cursor-pointer">
                                Customer Kiosk
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Functional</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href="/kitchen">
                            <Button className="hover:cursor-pointer">
                                Kitchen Display
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            Real-time kitchen order tracking system for managing
                            pending and completed orders
                        </p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href="/login">
                            <Button className="hover:cursor-pointer">
                                Employees/Managers
                            </Button>
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>
                            Includes authentication and redirects for
                            appropriate user; yet to implement manager dashboard
                            and proper order submission
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
