interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: string;
  type: string; 
}

export default function StatCard({ title, value, description, icon }: StatCardProps) {
  return (
    <div className="bg-white p-24 rounded-lg border border-steel-200 shadow-sm transition-hover hover:shadow-md">
      <div className="flex items-center gap-12 mb-16">
        <div className="w-48 h-48 bg-steel-100 rounded-md flex items-center justify-center text-24">
          {icon}
        </div>
        <h3 className="font-bold text-steel-700">{title}</h3>
      </div>
      <p className="text-32 font-black text-steel-800">{value}</p>
      <p className="text-12 text-steel-500 mt-4">{description}</p>
    </div>
  );
}