/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Track Side Ops verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fkkemgtdxbsqvtsidhvu.supabase.co/storage/v1/object/public/email-assets/trackside-logo.png"
          alt="Track Side Ops"
          width="180"
          style={logo}
        />
        <Heading style={h1}>Confirm it's you</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code expires shortly. Didn't request it? Ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
const brandRed = '#ef3c3c'
const main = { backgroundColor: '#ffffff', fontFamily: fontStack, padding: '24px 0' }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto', border: '1px solid #ececec', borderRadius: '16px', backgroundColor: '#ffffff' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0f12', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3a3d44', lineHeight: '1.55', margin: '0 0 16px' }
const codeStyle = { fontFamily: "'SF Mono', Menlo, Consolas, monospace", fontSize: '34px', fontWeight: 'bold' as const, letterSpacing: '0.4em', color: brandRed, backgroundColor: '#fff5f5', border: `1px solid ${brandRed}33`, borderRadius: '12px', padding: '18px 12px', textAlign: 'center' as const, margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#9a9da4', margin: '28px 0 0', lineHeight: '1.5' }
