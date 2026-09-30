import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCurrentUser } from '#/lib/api/hooks'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

const LOGO_URL =
  'https://res.cloudinary.com/ntlaloe-org/image/upload/w_384,f_png/v1782201264/TD_Holdings_mm9zfc.png'

function Home() {
  const navigate = useNavigate()
  const { data, isLoading } = useCurrentUser()
  const currentUser = data?.user
  const isLoggedIn = !!currentUser

  const handleClick = () => {
    navigate({ to: isLoggedIn ? '/dashboard' : '/sign-in' })
  }

  return (
    <div className="grid h-screen grid-cols-1 overflow-hidden md:grid-cols-2">
      <div className="hidden items-center justify-center bg-muted md:flex">
        <img
          src={LOGO_URL}
          alt="TD Holdings"
          className="max-h-64 w-auto object-contain"
        />
      </div>

      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
        <img
          src={LOGO_URL}
          alt="TD Holdings"
          className="h-20 w-auto object-contain md:hidden"
        />
        <h1 className="text-3xl font-bold tracking-tight">TD Holdings</h1>
        <p className="text-muted-foreground">Inventory & Point of Sale</p>

        <Button size="lg" className="mt-4 w-48" onClick={handleClick} disabled={isLoading}>
          {isLoading ? 'Loading...' : isLoggedIn ? 'Dashboard' : 'Sign In'}
        </Button>
      </div>
    </div>
  )
}