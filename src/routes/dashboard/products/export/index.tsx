import { createFileRoute } from "@tanstack/react-router";
import { useApiQuery } from '#/lib/api/hooks'
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard/products/export/")({
    component: ExportProductsPage,
});

function ExportProductsPage() {
    const { data: products } = useApiQuery<any>('products.getAllProducts', '/api/products');
    const productsArray = Array.isArray(products) ? products : (products as any)?.products || [];

    const jsonString = useMemo(() => {
        if (!productsArray) return "";
        return JSON.stringify(productsArray, null, 2);
    }, [productsArray]);

    const downloadJSON = () => {
        if (!productsArray) return;

        const blob = new Blob([jsonString], {
            type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = `products-export-${new Date().toISOString()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    };

    if (!products) {
        return (
            <div className="p-6 text-sm text-gray-500">
                Loading products export...
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">
                    Products JSON Export
                </h1>

                <button
                    onClick={downloadJSON}
                    className="px-4 py-2 bg-black text-white rounded-md hover:opacity-80"
                >
                    Download JSON
                </button>
            </div>

            {/* Meta info */}
            <div className="text-sm text-gray-600">
                Total Products: <strong>{productsArray.length}</strong>
            </div>

            {/* JSON Viewer */}
            <pre className="bg-gray-900 text-green-300 p-4 rounded-md overflow-auto text-xs h-[70vh]">
                {jsonString}
            </pre>
        </div>
    );
}