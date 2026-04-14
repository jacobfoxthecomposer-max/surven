# Surven SaaS Dashboard Development Guide
## Best Practices & Implementation Patterns for 2026

---

## Part 1: Performance & Architecture

### React Best Practices (2026)

✅ **Use React 19 features:**
- Server Components (via Next.js) for heavy data processing
- Automatic batching for state updates
- Concurrent rendering for smooth UI

✅ **State Management:**
- Local state by default (useState)
- TanStack Query (React Query) for server state
- Context API only for deeply nested props (avoid over-nesting)
- Never lift state higher than necessary

✅ **Component Architecture:**
- **Container Components:** Handle data, state, business logic
- **Presentational Components:** Pure render functions, receive props only
- **Custom Hooks:** Extract stateful logic, reusable across components
- **Atomic Design:** Atoms (Button, Input) → Molecules (Card, Form) → Organisms (Dashboard Section) → Templates/Pages

✅ **Performance Optimization:**
- Use `React.memo()` on expensive presentational components
- Lazy load routes with `React.lazy()` + `Suspense`
- Use `useMemo()` and `useCallback()` only when measuring shows issues
- Avoid unnecessary re-renders with proper dependency arrays

### File Structure (Feature-Based)

```
src/
├── components/
│   ├── atoms/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── Spinner.tsx
│   ├── molecules/
│   │   ├── Card.tsx
│   │   ├── FormField.tsx
│   │   └── Toast.tsx
│   └── organisms/
│       ├── DashboardGaugeSection.tsx
│       ├── ModelBreakdownSection.tsx
│       └── PromptResultsSection.tsx
├── features/
│   ├── auth/
│   │   ├── hooks/useAuth.ts
│   │   ├── pages/LoginPage.tsx
│   │   └── services/authService.ts
│   ├── dashboard/
│   │   ├── hooks/useScan.ts
│   │   ├── pages/DashboardPage.tsx
│   │   └── services/scanService.ts
│   ├── business/
│   │   ├── hooks/useBusiness.ts
│   │   └── services/businessService.ts
│   └── onboarding/
│       ├── pages/OnboardingPage.tsx
│       └── services/onboardingService.ts
├── hooks/
│   ├── useScroll.ts
│   └── useAnimation.ts
├── services/
│   ├── supabase.ts (Supabase client setup)
│   ├── api.ts (API calls)
│   └── mockScanEngine.ts (Mock data generator)
├── types/
│   ├── database.ts (Supabase types)
│   └── business.ts (Domain types)
├── styles/
│   └── globals.css (Tailwind + theme variables)
└── utils/
    ├── cn.ts (classname helper)
    └── constants.ts (Colors, timings, etc.)
```

---

## Part 2: Animations & Interactions

### Framer Motion Best Practices

✅ **Always animate transform/opacity only:**
```javascript
// GOOD: Uses GPU-accelerated transform
<motion.div
  animate={{ x: 100, opacity: 0.5 }}
  transition={{ duration: 0.3 }}
/>

// BAD: Causes layout reflows
<motion.div
  animate={{ width: 200, height: 200 }}
  transition={{ duration: 0.3 }}
/>
```

✅ **Scroll Animations:**
```javascript
import { useScroll, useTransform } from 'framer-motion'

export function ScrollReveal() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 100], [0, 1])

  return <motion.div style={{ opacity }} />
}
```

✅ **Staggered List Animations:**
```javascript
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // 100ms delay between items
      delayChildren: 0.2,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}
```

✅ **Animation Timings:**
- Micro-interactions (button hover): 150–250ms
- Page transitions: 300–400ms
- Entrance animations: 400–600ms
- Chart animations: 600–1200ms

✅ **Respect prefers-reduced-motion:**
```javascript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const getDuration = () => prefersReducedMotion ? 0 : 300
```

### Three.js WebGL Shader Animations

✅ **Setup for Hero Background:**
```typescript
import * as THREE from 'three'
import { useRef, useEffect } from 'react'

export function ShaderAnimation({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Scene, Camera, Renderer setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)

    // Vertex shader: Simple passthrough
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // Fragment shader: Animated rings with time
    const fragmentShader = `
      uniform float time;
      varying vec2 vUv;
      
      void main() {
        vec2 center = vec2(0.5);
        float dist = distance(vUv, center);
        float ring = sin(dist * 10.0 - time * 2.0) * 0.5 + 0.5;
        
        vec3 color = vec3(
          sin(time * 0.5) * 0.5 + 0.5,
          sin(time * 0.3) * 0.5 + 0.5,
          sin(time * 0.7) * 0.5 + 0.5
        );
        
        gl_FragColor = vec4(color * ring, 1.0);
      }
    `

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { time: { value: 0 } }
    })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    // Animation loop
    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)
      material.uniforms.time.value += 0.01
      renderer.render(scene, camera)
    }
    animate()

    sceneRef.current = scene

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className={className} />
}
```

### 21st.dev Component Integration

✅ **Radar Effect Pattern (Concentric Circles + Icons):**
- Use Framer Motion for entrance animations
- Rotate a sweep line using `animate={{ rotate: 360 }}` with `infinite: true` and long duration
- Place icons in circles around the radar
- Use `AnimatePresence` + click handlers for conditional tooltip rendering

✅ **Feature Carousel Pattern (Auto-Scrolling):**
```css
@keyframes card-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.card-strip {
  animation: card-scroll 32s linear infinite;
}

.card-strip:hover {
  animation-play-state: paused;
}

.card-strip::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 200px;
  height: 100%;
  background: linear-gradient(to left, #0f172a, transparent);
  pointer-events: none;
}
```

✅ **Interactive Timeline Pattern:**
- Track `hoveredStep` in component state
- Apply transforms on hover: `scale(1.06) translateY(-6px)`
- Use colored shadows: `box-shadow: 0 24px 48px -8px rgb(...color... / 0.4)`
- Apply smooth CSS transitions: `transition: all 0.3s ease`

**Sources:**
- [Motion Examples](https://motion.dev/examples)
- [Framer Motion Scroll](https://www.framer.com/motion/use-scroll/)
- [Three.js Documentation](https://threejs.org/docs/)
- [React Scroll Animations Guide](https://blog.logrocket.com/react-scroll-animations-framer-motion/)

---

## Part 3: Data Visualization

### Recharts Accessibility & Dark Mode

✅ **Dark Mode Implementation:**
```javascript
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const DARK_MODE = {
  background: '#0f172a',
  gridColor: '#334155',
  textColor: '#f1f5f9',
  lineColor: '#4361ee',
}

export function HistoryChart({ data }) {
  return (
    <LineChart data={data} backgroundColor={DARK_MODE.background}>
      <XAxis stroke={DARK_MODE.textColor} />
      <YAxis stroke={DARK_MODE.textColor} />
      <Line 
        type="monotone" 
        dataKey="score" 
        stroke={DARK_MODE.lineColor}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: DARK_MODE.background,
          border: `1px solid ${DARK_MODE.gridColor}`,
          color: DARK_MODE.textColor,
        }}
      />
    </LineChart>
  )
}
```

✅ **Accessibility Checklist:**
- [ ] Chart has `aria-label` describing its purpose
- [ ] Legend uses `tabIndex={0}` for keyboard access
- [ ] Tooltip announces data on focus (use `role="tooltip"`)
- [ ] Alternative text-based table provided for data
- [ ] Use patterns/shapes in addition to colors (colorblind-friendly)
- [ ] Contrast ratio ≥ 4.5:1 for all text/lines

✅ **Performance:**
```javascript
const memoizedData = useMemo(() => processChartData(rawData), [rawData])
```

**Sources:**
- [Recharts Dark Mode](https://www.cleanchart.app/blog/dark-mode-charts)
- [Accessible Charts](https://www.a11y-collective.com/blog/accessible-charts/)
- [Recharts Accessibility Wiki](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)

---

## Part 4: Forms & Validation

### React Form Validation

✅ **Recommended: React Hook Form + Zod**
```javascript
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onBlur', // Show errors after blur, not on every keystroke
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span role="alert">{errors.email.message}</span>}
      
      <button disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}
```

✅ **Validation Timing:**
- Show errors **after blur** (not on keystroke) to avoid overwhelming users
- Use `touched` state to only show errors for visited fields
- Real-time validation only for critical fields (email availability, password strength)

✅ **Error Display:**
- Error messages appear **below the field** (not above)
- Use `role="alert"` for screen reader announcements
- Keep messages short and actionable ("Min 8 characters" not "Field validation failed")

✅ **Accessibility:**
```javascript
<input
  {...register('email')}
  aria-label="Email address"
  aria-describedby="email-error"
  aria-invalid={!!errors.email}
/>
{errors.email && (
  <span id="email-error" role="alert" className="text-red-500">
    {errors.email.message}
  </span>
)}
```

**Sources:**
- [React Form Validation Guide](https://formspree.io/blog/react-form-validation/)
- [Accessible Forms in React](https://oneuptime.com/blog/post/2026-01-15-accessible-forms-react-aria/view)
- [Guide to Accessible Form Validation](https://www.smashingmagazine.com/2023/02/guide-accessible-form-validation/)

---

## Part 5: Styling & Theming

### Tailwind CSS + Dark Mode

✅ **Setup (in tailwind.config.ts):**
```javascript
export default {
  darkMode: 'class', // Use class strategy for user control
  theme: {
    extend: {
      colors: {
        'brand-bg': 'var(--color-bg)',
        'brand-primary': 'var(--color-primary)',
        'brand-accent': 'var(--color-accent)',
      },
    },
  },
}
```

✅ **CSS Variables (in globals.css):**
```css
@layer base {
  :root {
    /* Light mode (default) */
    --color-bg: #ffffff;
    --color-fg: #1e293b;
    --color-primary: #4361ee;
    --color-accent: #06d6a0;
  }

  html.dark {
    /* Dark mode */
    --color-bg: #0f172a;
    --color-fg: #f1f5f9;
    --color-primary: #4361ee;
    --color-accent: #06d6a0;
  }
}
```

✅ **Usage in Components:**
```javascript
<div className="bg-brand-bg text-brand-fg dark:text-brand-fg">
  {/* Automatically switches with dark mode */}
</div>
```

✅ **Theme Toggle:**
```javascript
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check localStorage or system preference
    const isDarkMode = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [])

  const toggle = () => {
    const newDark = !isDark
    setIsDark(newDark)
    document.documentElement.classList.toggle('dark', newDark)
    localStorage.setItem('theme', newDark ? 'dark' : 'light')
  }

  return <button onClick={toggle}>Toggle Dark Mode</button>
}
```

**Sources:**
- [Tailwind Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)
- [Dark Mode Best Practices](https://eastondev.com/blog/en/posts/dev/20260328-tailwind-dark-mode-comparison/)
- [CSS Variables Theming](https://pickcss.com/blog/dark-mode-css-variables)

---

## Part 6: Authentication & Security

### Supabase Auth Best Practices

✅ **Password Security:**
- Enforce minimum 8-character passwords
- Use bcrypt hashing (handled by Supabase)
- Implement rate limiting on login attempts
- Never log passwords or send them unencrypted

✅ **Email Verification:**
```javascript
import { supabase } from '@/services/supabase'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}
```

✅ **Session Management (AuthProvider pattern — REQUIRED):**

> ⚠️ **Critical:** Never call `useAuth()` as a standalone hook that creates its own subscription. Every component that calls it independently creates a separate Supabase listener with its own `useState(null)`, causing auth state to flicker between components and creating redirect loops. Always use the AuthProvider context pattern below.

```javascript
// src/features/auth/hooks/useAuth.tsx
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext value={{ user, loading }}>{children}</AuthContext>
}

// useAuth() just reads context — no subscription, no useState
export function useAuth() {
  return useContext(AuthContext)
}
```

Wrap the entire app once in `AuthProvider` (inside `Providers.tsx`). Every `useAuth()` call then reads the same shared state — one subscription, zero flickering.

✅ **Redirect URL Whitelist:**
- Configure allowed redirect URLs in Supabase dashboard
- Prevents open redirect vulnerabilities
- Use environment variables for URLs

✅ **Secrets Management:**
- Never commit API keys to version control
- Use `.env.local` (add to `.gitignore`)
- Use environment variables for secrets

**Sources:**
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Auth Best Practices](https://www.supadex.app/blog/best-security-practices-in-supabase-a-comprehensive-guide)

---

## Part 7: Circular Progress Gauge

### Animated Gauge Implementation

✅ **Using React Spring + SVG:**
```javascript
import { useSpring, animated } from '@react-spring/web'

interface GaugeProps {
  score: number // 0-100
  animate?: boolean
}

export function VisibilityGauge({ score, animate = true }: GaugeProps) {
  const springValue = useSpring({
    value: animate ? score : score,
    from: { value: 0 },
    config: { tension: 100, friction: 30 }, // Snappy feel
  })

  const strokeDashoffset = springValue.value.to(
    (value) => 1000 - (value / 100) * 1000 // 1000 is circumference
  )

  const getColor = (value: number) => {
    if (value < 25) return '#ef4444' // Red
    if (value < 50) return '#f97316' // Orange
    if (value < 75) return '#84cc16' // Green
    return '#06d6a0' // Teal
  }

  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      {/* Background circle */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="#334155"
        strokeWidth="8"
      />
      
      {/* Progress circle */}
      <animated.circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke={getColor(score)}
        strokeWidth="8"
        strokeDasharray="1000"
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />

      {/* Score text */}
      <text
        x="100"
        y="105"
        textAnchor="middle"
        fontSize="48"
        fontWeight="bold"
        fill="#f1f5f9"
      >
        {Math.round(score)}
      </text>
      <text
        x="100"
        y="135"
        textAnchor="middle"
        fontSize="16"
        fill="#cbd5e1"
      >
        {score < 25 && 'Not Visible'}
        {score >= 25 && score < 50 && 'Low Visibility'}
        {score >= 50 && score < 75 && 'Moderately Visible'}
        {score >= 75 && 'Highly Visible'}
      </text>
    </svg>
  )
}
```

✅ **Spring Configuration:**
- `tension: 100` = snappy animation
- `friction: 30` = smooth landing
- `mass: 1` = standard responsiveness

**Sources:**
- [React Spring Docs](https://github.com/pmndrs/react-spring)
- [Animated Progress Circle](https://learning.atheros.ai/blog/how-to-develop-an-animated-progress-circle-component-using-svgs-react-and-react-spring)
- [React Spring Visualizer](https://react-spring-visualizer.com/)

---

## Part 8: Component Composition

### Recommended Patterns

✅ **Container/Presentational Split:**
```javascript
// Container: Handles data, logic
export function DashboardGaugeSectionContainer() {
  const { business } = useAuth()
  const { scan, runScan, isLoading } = useScan(business.id)

  return (
    <DashboardGaugeSection
      score={scan?.visibility_score || 0}
      businessName={business.name}
      onRunScan={runScan}
      isLoading={isLoading}
    />
  )
}

// Presentational: Pure render
interface DashboardGaugeSectionProps {
  score: number
  businessName: string
  onRunScan: () => void
  isLoading: boolean
}

export function DashboardGaugeSection({
  score,
  businessName,
  onRunScan,
  isLoading,
}: DashboardGaugeSectionProps) {
  return (
    <div className="flex items-center gap-8">
      <VisibilityGauge score={score} animate />
      <div>
        <h1>{businessName}</h1>
        <button onClick={onRunScan} disabled={isLoading}>
          {isLoading ? 'Running scan...' : 'Run New Scan'}
        </button>
      </div>
    </div>
  )
}
```

✅ **Custom Hooks for Data:**
```javascript
export function useScan(businessId: string) {
  const [scan, setScan] = useState<Scan | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const runScan = useMutation(async () => {
    setIsLoading(true)
    const result = await scanService.runScan(businessId)
    setScan(result)
    queryClient.invalidateQueries({ queryKey: ['scan', businessId] })
    setIsLoading(false)
    return result
  })

  return { scan, runScan, isLoading }
}
```

**Sources:**
- [React Architecture Patterns](https://dev.to/drruvari/building-scalable-react-applications-design-patterns-and-architecture-39a0)
- [Modularizing React Apps](https://martinfowler.com/articles/modularizing-react-apps.html)
- [Scaling Component Architecture](https://dev.to/nithinbharathwaj/scaling-react-component-architecture-expert-patterns-for-large-javascript-applications-5fh3)

---

## Quick Reference Checklist

Before launching, verify:

- [ ] All animations respect `prefers-reduced-motion`
- [ ] Form fields have labels + error messages + aria attributes
- [ ] Charts have legends, tooltips, alt text
- [ ] Touch targets are ≥44×44px
- [ ] Color contrast ≥4.5:1 (WCAG AA)
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Dark mode tested and contrasts verified
- [ ] Loading states show skeleton/spinner (not instant jump)
- [ ] Error messages are clear and actionable
- [ ] API keys never committed to git
- [ ] Responsive tested at 375px, 768px, 1024px, 1440px
- [ ] Performance optimized (no unnecessary re-renders)
- [ ] Animations smooth (60fps, no jank)

---

**This guide synthesizes 2026 best practices. Reference it throughout build.**
