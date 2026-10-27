import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { api } from "../../../../lib/api";
import { colors } from "../../../../theme";

type Grade = { submission_id: string; assignment_title: string; max_marks: number; score: number; submitted_at: string | null };
export default function MyCCIGrades() {
  const { code = "chayil" } = useLocalSearchParams<{ code: string }>(); const [grades, setGrades] = useState<Grade[]>([]); const [error, setError] = useState("");
  useEffect(() => { api.academy.myCciGrades(code).then((rows) => setGrades(rows as unknown as Grade[])).catch((e: Error) => setError(e.message)); }, [code]);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}><Button onPress={() => router.back()}>← CCI Command Center</Button><Text style={{ color: colors.gold500, letterSpacing: 2, fontSize: 11, marginTop: 8 }}>CHAYIL COMPANY INTENSIVE</Text><Text variant="headlineMedium" style={{ color: colors.ink, fontWeight: "700", marginTop: 4 }}>My grades</Text><Text style={{ color: colors.inkMuted, marginTop: 8 }}>Only your graded assessments are shown.</Text>{error && <Text style={{ color: "#ef4444", marginTop: 20 }}>{error}</Text>}<View style={{ gap: 12, marginTop: 20 }}>{grades.map((grade) => <Card key={grade.submission_id} style={{ backgroundColor: colors.elevated }}><Card.Content style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: "700" }}>{grade.assignment_title}</Text><Text style={{ color: colors.inkMuted, fontSize: 12, marginTop: 3 }}>Maximum {grade.max_marks}</Text></View><Text style={{ color: colors.gold500, fontSize: 24, fontWeight: "700" }}>{grade.score}</Text></Card.Content></Card>)}{!grades.length && !error && <Text style={{ color: colors.inkMuted }}>No graded assessments are available.</Text>}</View></ScrollView>;
}
