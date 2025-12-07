'use client';

import FunPayWorkerDashboard from "@/components/funpay-worker-dashboard";
import { useWindowSize } from '@/hooks/use-window-size';

export default function DashboardPage() {
    const { width = 0 } = useWindowSize();

    return (
        <div className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                <FunPayWorkerDashboard />
            </div>
        </div>
    );
}
