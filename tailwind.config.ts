import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'f1': ['Titillium Web', 'sans-serif'],
				'sans': ['Titillium Web', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				'f1-red': 'hsl(var(--f1-red))',
				'f1-red-dark': 'hsl(var(--f1-red-dark))',
				'f1-black': 'hsl(var(--f1-black))',
				'f1-dark-gray': 'hsl(var(--f1-dark-gray))',
				'f1-medium-gray': 'hsl(var(--f1-medium-gray))',
				'f1-light-gray': 'hsl(var(--f1-light-gray))',
				'f1-silver': 'hsl(var(--f1-silver))',
				'success': 'hsl(var(--success))',
				'warning': 'hsl(var(--warning))',
				'racing-green': 'hsl(var(--racing-green))',
				'racing-yellow': 'hsl(var(--racing-yellow))'
			},
			backgroundImage: {
				'gradient-f1': 'var(--gradient-f1)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-dark': 'var(--gradient-dark)',
				'gradient-stat-card': 'var(--gradient-stat-card)'
			},
			boxShadow: {
				'f1': 'var(--shadow-f1)',
				'dark': 'var(--shadow-dark)',
				'glow': 'var(--shadow-glow)',
				'card': 'var(--shadow-card)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'slideRight': {
					'0%': { transform: 'translateX(-100px)' },
					'100%': { transform: 'translateX(calc(100vw + 100px))' }
				},
				'speedLine': {
					'0%': { transform: 'translateX(-100px)', opacity: '0' },
					'50%': { opacity: '0.3' },
					'100%': { transform: 'translateX(100vw)', opacity: '0' }
				},
				'flag-wave': {
					'0%, 100%': { transform: 'rotate(0deg)' },
					'25%': { transform: 'rotate(5deg)' },
					'50%': { transform: 'rotate(0deg)' },
					'75%': { transform: 'rotate(-5deg)' }
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px hsl(var(--racing-green) / 0.4)' },
					'50%': { boxShadow: '0 0 40px hsl(var(--racing-green) / 0.8)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'slide-right': 'slideRight 4s ease-in-out infinite',
				'speed-line': 'speedLine 2s linear infinite',
				'flag-wave': 'flag-wave 2s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
