import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";

type EmptyPageProps = {
  title: string;
};

export default function EmptyPage({ title }: EmptyPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Secțiune în lucru</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Conținutul acestei pagini va fi afișat aici.
        </div>
      </CardContent>
    </Card>
  );
}
