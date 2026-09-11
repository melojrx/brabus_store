import Navbar from "@/components/Navbar"
import { isOnlineSalesEnabled } from "@/lib/online-sales"

export default function NavbarWithSalesMode() {
  return <Navbar onlineSalesEnabled={isOnlineSalesEnabled()} />
}
