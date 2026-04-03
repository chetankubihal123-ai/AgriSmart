import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-2xl z-50">
                <p className="font-extrabold text-prodmast-dark uppercase text-[10px] tracking-widest mb-2 pb-2 border-b border-gray-100">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm flex items-center gap-2" style={{ color: entry.color || entry.fill }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></span>
                        <span className="font-medium text-prodmast-muted">{entry.name}:</span>
                        <span className="font-extrabold text-prodmast-dark">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// 1. Yield Predictions over time
export const YieldChart = ({ data }: { data: any[] }) => {
    return (
        <div className="h-[380px] w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col hover:border-prodmast-primary/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-prodmast-dark mb-1 tracking-tight">Yield Predictions</h3>
            <p className="text-sm font-medium text-prodmast-muted mb-6">Historical actuals vs. Expected bounds</p>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a3e635" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#a3e635" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="actual" name="Historical Yield" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                    <Area type="monotone" dataKey="expected" name="Predicted Expected" stroke="#a3e635" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorExpected)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// 2. Crop Performance
export const CropDistributionChart = ({ data }: { data: any[] }) => {
    return (
        <div className="h-[380px] w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col hover:border-prodmast-primary/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-prodmast-dark mb-1 tracking-tight">Crop Performance Output</h3>
            <p className="text-sm font-medium text-prodmast-muted mb-6">Comparative metrics by crop type</p>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="value" fill="#a3e635" name="Output Volume" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

// 3. Health Over Time
export const HealthTrendChart = ({ data }: { data: any[] }) => {
    return (
        <div className="h-[380px] w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col hover:border-prodmast-primary/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-prodmast-dark mb-1 tracking-tight">Crop Health Trends</h3>
            <p className="text-sm font-medium text-prodmast-muted mb-6">Seasonal aggregate vitality score</p>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#64748b" fontSize={11} axisLine={false} tickLine={false} domain={[60, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Area type="monotone" dataKey="health" name="Avg Health Score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorHealth)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

// 4. Soil Health Radar
export const SoilRadarChart = ({ data }: { data: any[] }) => {
    return (
        <div className="h-[380px] w-full bg-white rounded-3xl border border-gray-200 shadow-sm p-8 flex flex-col hover:border-prodmast-primary/30 transition-all duration-300">
            <h3 className="text-xl font-bold text-prodmast-dark mb-1 tracking-tight">Soil Health Trends</h3>
            <p className="text-sm font-medium text-prodmast-muted mb-2">Nitrogen, Phosphorus, K & Moisture</p>
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                        name="Current Density"
                        dataKey="A"
                        stroke="#a3e635"
                        strokeWidth={2}
                        fill="#a3e635"
                        fillOpacity={0.5}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
};
