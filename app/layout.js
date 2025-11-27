import './globals.css'

export const metadata = {
  title: 'MuseShift - Personal Energy Intelligence',
  description: 'Track your energy states & sonic journeys throughout the day',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="scanlines">{children}</body>
    </html>
  )
}
