import { InterestChart } from '../InterestChart';

const mockData = [
  { month: 'May', received: 65000, pending: 45000 },
  { month: 'Jun', received: 72000, pending: 52000 },
  { month: 'Jul', received: 68000, pending: 48000 },
  { month: 'Aug', received: 85000, pending: 65000 },
  { month: 'Sep', received: 92000, pending: 72000 },
  { month: 'Oct', received: 84000, pending: 68000 },
];

export default function InterestChartExample() {
  return (
    <div className="p-6">
      <InterestChart
        title="Interest Trends (Last 6 Months)"
        data={mockData}
        onExport={() => console.log('Export chart')}
      />
    </div>
  );
}
