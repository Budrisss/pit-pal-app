/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  token,
}: SignupEmailProps) => (
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
        <Heading style={h1}>Welcome to the paddock</Heading>
        <Text style={text}>
          Thanks for joining <strong>Track Side Ops</strong>. Confirm{' '}
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>{' '}
          to hit the grid.
        </Text>
        {token ? (
          <>
            <Text style={label}>YOUR VERIFICATION CODE</Text>
            <Text style={otpBox}>{token}</Text>
            <Text style={subtle}>
              Enter this 6-digit code in the app to finish creating your account. The code expires in 10 minutes.
            </Text>
            <Text style={fallbackLabel}>Or click to verify directly:</Text>
          </>
        ) : null}
        <Button style={button} href={confirmationUrl}>
          Verify Email
        </Button>
        <Text style={footer}>
          Didn't request this? You can safely ignore this email — no account will be created.
        </Text>
        <Text style={footer}>
          <Link href={siteUrl} style={footerLink}>{siteName}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
const brandRed = '#ef3c3c'
const main = { backgroundColor: '#ffffff', fontFamily: fontStack, padding: '24px 0' }
const container = {
  padding: '32px 28px',
  maxWidth: '520px',
  margin: '0 auto',
  border: '1px solid #ececec',
  borderRadius: '16px',
  backgroundColor: '#ffffff',
}
const logo = { margin: '0 0 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0d0f12',
  margin: '0 0 16px',
  letterSpacing: '-0.01em',
}
const text = { fontSize: '15px', color: '#3a3d44', lineHeight: '1.55', margin: '0 0 20px' }
const link = { color: brandRed, textDecoration: 'underline' }
const label = {
  fontSize: '11px',
  letterSpacing: '0.12em',
  color: '#7a7d85',
  fontWeight: 'bold' as const,
  margin: '4px 0 8px',
}
const otpBox = {
  fontFamily: "'SF Mono', Menlo, Consolas, monospace",
  fontSize: '34px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.4em',
  color: brandRed,
  backgroundColor: '#fff5f5',
  border: `1px solid ${brandRed}33`,
  borderRadius: '12px',
  padding: '18px 12px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
const subtle = { fontSize: '13px', color: '#6b6e75', lineHeight: '1.5', margin: '0 0 28px' }
const fallbackLabel = { fontSize: '12px', color: '#7a7d85', margin: '0 0 8px' }
const button = {
  backgroundColor: brandRed,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9a9da4', margin: '28px 0 0', lineHeight: '1.5' }
const footerLink = { color: '#9a9da4', textDecoration: 'underline' }
