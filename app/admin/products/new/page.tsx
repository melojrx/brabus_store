import ProductsManager from "../ProductsManager"
import { getProductEditorData } from "../product-editor-data"

export default async function NewProductPage() {
  const categories = await getProductEditorData()
  return <ProductsManager initialProducts={[]} categories={categories} filters={{ search: "", status: "", parentCategory: "", subcategory: "", featured: "", expiry: "" }} expiryThresholds={{ warningDays: 30, criticalDays: 7 }} pagination={{ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 }} editorProduct={null} />
}
