// components/reports/pdf/PDFTemplate.tsx
import * as React from "react";
import { PDFViewer, Document, Page } from "@react-pdf/renderer";

interface PDFTemplateProps {
    children: React.ReactNode;
    showToolbar?: boolean;
}

export function PDFTemplate({ children, showToolbar = true }: PDFTemplateProps) {
    return (
        <PDFViewer
            width="100%"
            height="100%"
            showToolbar={showToolbar}
            style={{ minHeight: "500px" }}
        >
            <Document>
                <Page size="A4" style={{ padding: 30 }}>
                    {children}
                </Page>
            </Document>
        </PDFViewer>
    );
}