import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/internal?tab=submissions");
}
