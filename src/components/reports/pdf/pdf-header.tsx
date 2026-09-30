// components/reports/pdf/PDFHeader.tsx
import { Text, View, StyleSheet } from "@react-pdf/renderer";

interface PDFHeaderProps {
    title: string;
    subtitle?: string;
    date?: string;
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 20,
        borderBottom: 1,
        borderBottomColor: "#e5e7eb",
        paddingBottom: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: "#6b7280",
        marginBottom: 5,
    },
    date: {
        fontSize: 12,
        color: "#6b7280",
    },
});

export function PDFHeader({ title, subtitle, date }: PDFHeaderProps) {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {date && <Text style={styles.date}>Generated: {date}</Text>}
        </View>
    );
}