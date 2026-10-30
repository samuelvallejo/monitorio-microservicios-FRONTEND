import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const serviceLabels = { inventory: 'Inventario', orders: 'Pedidos', payments: 'Pagos' }
const formatTime = value => `${Number(value || 0).toFixed(0)} ms`

function LatencyChart({ data }) {
  return <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
    <defs>
      <linearGradient id="inventoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5389f5" stopOpacity={0.12} /><stop offset="100%" stopColor="#5389f5" stopOpacity={0} /></linearGradient>
      <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9271e9" stopOpacity={0.1} /><stop offset="100%" stopColor="#9271e9" stopOpacity={0} /></linearGradient>
      <linearGradient id="paymentsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9a84d" stopOpacity={0.1} /><stop offset="100%" stopColor="#e9a84d" stopOpacity={0} /></linearGradient>
    </defs>
    <CartesianGrid vertical={false} stroke="#edf0f3" strokeDasharray="4 5" />
    <XAxis dataKey="call" tickLine={false} axisLine={false} tick={{ fill: '#98a0ad', fontSize: 11 }} interval={3} />
    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#98a0ad', fontSize: 11 }} tickFormatter={value => `${value}ms`} />
    <Tooltip contentStyle={{ border: '1px solid #e9edf2', borderRadius: 10, boxShadow: '0 8px 24px #26344a12', fontSize: 12 }} formatter={(value, name) => [formatTime(value), serviceLabels[name]]} labelFormatter={label => `Llamada ${label}`} />
    <Area connectNulls type="monotone" dataKey="inventory" stroke="#5389f5" strokeWidth={2} fill="url(#inventoryFill)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
    <Area connectNulls type="monotone" dataKey="orders" stroke="#9271e9" strokeWidth={2} fill="url(#ordersFill)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
    <Area connectNulls type="monotone" dataKey="payments" stroke="#e9a84d" strokeWidth={2} fill="url(#paymentsFill)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
  </AreaChart></ResponsiveContainer>
}

export default LatencyChart
