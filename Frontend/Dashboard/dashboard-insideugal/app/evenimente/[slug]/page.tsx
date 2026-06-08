import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { dashboardEvents } from "../../data/events";

type EventPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return dashboardEvents.map((event) => ({
    slug: event.slug,
  }));
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = dashboardEvents.find((item) => item.slug === slug);

  if (!event) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{event.title}</CardTitle>
        <CardDescription>
          {new Intl.DateTimeFormat("ro-RO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(new Date(`${event.date}T00:00:00`))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Detaliile evenimentului vor fi afișate aici.
        </div>
      </CardContent>
    </Card>
  );
}
