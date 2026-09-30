// components/reports/pdf/PDFSummary.tsx
import { Text, View, StyleSheet } from "@react-pdf/renderer";

interface PDFSummaryProps {
    items: Array<{ label: string; value: string | number }>;
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 20,
        padding: 10,
        backgroundColor: "#f9fafb",
        borderRadius: 4,
    },
    item: {
        width: "33.33%",
        marginBottom: 5,
        paddingHorizontal: 5,
    },
    label: {
        fontSize: 10,
        color: "#6b7280",
    },
    value: {
        fontSize: 14,
        fontWeight: "bold",
    },
});

export function PDFSummary({ items }: PDFSummaryProps) {
    return (
        <View style={styles.container}>
            {items.map((item, index) => (
                <View key={index} style={styles.item}>
                    <Text style={styles.label}>{item.label}</Text>
                    <Text style={styles.value}>{item.value}</Text>
                </View>
            ))}
        </View>
    );
}