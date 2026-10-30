import { Link } from 'react-router-dom'

const facts = [
  ['~1/3', 'of all food produced worldwide is lost or wasted'],
  ['~1.05 bn t', 'of food wasted in 2022, most of it in households (UNEP)'],
  ['8–10%', 'of global greenhouse gas emissions come from food loss and waste'],
]
const steps = [
  ['1. Track', 'Log what you buy and when it expires.'],
  ['2. Use it up', 'See what is expiring soon and cook with it.'],
  ['3. Reflect', 'Record what you throw away and spot patterns.'],
]

export default function Home({ user }) {
  return (
    <div className="space-y-12">
      <section className="text-center py-8">
        <h1 className="text-3xl md:text-5xl font-bold text-green-800">Waste less food. Save money. Help the planet.</h1>
        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
          WasteLess helps you keep track of your groceries so nothing quietly expires at the back of the fridge.
          It supports UN Sustainable Development Goal 12, Target 12.3: halving per-capita food waste by 2030.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          {user ? <Link to="/inventory" className="btn">Open my inventory</Link> : <>
            <Link to="/register" className="btn">Get started – it's free</Link>
            <Link to="/login" className="btn-light">Log in</Link></>}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">The problem</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {facts.map(([n, t]) => (
            <div key={n} className="card"><p className="text-2xl font-bold text-orange-500">{n}</p><p className="text-sm text-gray-600 mt-1">{t}</p></div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-4">How WasteLess helps</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {steps.map(([h, t]) => (
            <div key={h} className="card"><p className="font-semibold text-green-700">{h}</p><p className="text-sm text-gray-600 mt-1">{t}</p></div>
          ))}
        </div>
      </section>
    </div>
  )
}
