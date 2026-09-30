import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "#/lib/utils.ts"
import { Input } from "./input.tsx"

/**
 * Password input with a show/hide (eye) toggle.
 *
 * Drop-in replacement for `<Input type="password" />` — pass the same props.
 * The eye button reveals the plain-text value the user typed (it does not and
 * cannot reverse the stored hash; it simply toggles the input's `type`).
 */
function PasswordInput({ className, disabled, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative w-full">
      <Input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-8 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}

export { PasswordInput }
