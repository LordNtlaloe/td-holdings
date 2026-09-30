// components/reports/pdf/PDFTable.tsx
import { Text, View, StyleSheet } from "@react-pdf/renderer";

interface PDFTableProps {
    columns: Array<{ key: string; header: string }>;
    data: any[];
}

const styles = StyleSheet.create({
    table: {
        marginBottom: 20,
    },
    headerRow: {
        flexDirection: "row",
        backgroundColor: "#f3f4f6",
        paddingVertical: 8,
        paddingHorizontal: 5,
        borderBottomWidth: 2,
        borderBottomColor: "#d1d5db",
    },
    headerCell: {
        flex: 1,
        fontSize: 10,
        fontWeight: "bold",
    },
    row: {
        flexDirection: "row",
        paddingVertical: 6,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    cell: {
        flex: 1,
        fontSize: 9,
    },
});

export function PDFTable({ columns, data }: PDFTableProps) {
    return (
        <View style={styles.table}>
            <View style={styles.headerRow}>
                {columns.map((col) => (
                    <Text key={col.key} style={styles.headerCell}>
                        {col.header}
                    </Text>
                ))}
            </View>
            {data.map((row, index) => (
                <View key={index} style={styles.row}>
                    {columns.map((col) => (
                        <Text key={col.key} style={styles.cell}>
                            {row[col.key] ?? ""}
                        </Text>
                    ))}
                </View>
            ))}
        </View>
    );
}