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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://fkkemgtdxbsqvtsidhvu.supabase.co/storage/v1/object/public/email-assets/trackside-logo.png"
          alt="Track Side Ops"
          width="180"
          style={logo}
        />
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We got a request to reset your <strong>{siteName}</strong> password. Click below to choose a new one.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        <Text style={footer}>
          Didn't request this? Ignore this email — your password stays the same.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif"
const brandRed = '#ef3c3c'
const main = { backgroundColor: '#ffffff', fontFamily: fontStack, padding: '24px 0' }
const container = { padding: '32px 28px', maxWidth: '520px', margin: '0 auto', border: '1px solid #ececec', borderRadius: '16px', backgroundColor: '#ffffff' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0d0f12', margin: '0 0 16px', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: '#3a3d44', lineHeight: '1.55', margin: '0 0 24px' }
const button = { backgroundColor: brandRed, color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9a9da4', margin: '28px 0 0', lineHeight: '1.5' }
