"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function PrivacyPolicy() {
  return (
    <div className="container max-w-4xl py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6 text-center">Privacy Policy</h1>
        <p className="text-muted-foreground text-center mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              At Everwood, we respect your privacy and are committed to
              protecting your personal data. This Privacy Policy explains how we
              collect, use, and safeguard your information when you use our
              service.
            </p>
            <p>
              Please read this Privacy Policy carefully. By using our
              application, you consent to the practices described in this
              policy.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your name</li>
              <li>Email address</li>
              <li>
                Profile picture (if provided through authentication providers)
              </li>
            </ul>

            <h3 className="font-semibold text-lg mt-6">Design Data</h3>
            <p>We collect and store:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your custom designs and palettes</li>
              <li>Design preferences and settings</li>
              <li>Saved designs and configurations</li>
            </ul>

            <h3 className="font-semibold text-lg mt-6">Usage Information</h3>
            <p>
              We automatically collect certain information when you use our
              application:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Pages visited and features used</li>
              <li>Time and date of your visits</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              How We Use Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process and save your designs</li>
              <li>Authenticate your identity and maintain your account</li>
              <li>
                Send you important notifications about your account or designs
              </li>
              <li>Respond to your comments, questions, and requests</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Protect the security and integrity of our platform</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Data Storage and Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We use MongoDB to store your design data and account information.
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized or unlawful
              processing, accidental loss, destruction, or damage.
            </p>
            <p>
              While we strive to use commercially acceptable means to protect
              your personal information, we cannot guarantee its absolute
              security. Any transmission of personal information is at your own
              risk.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We use third-party services that may collect information used to
              identify you:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="font-semibold">Google OAuth:</span> For
                authentication purposes. Please refer to Google's Privacy Policy
                for details on how they handle your data.
              </li>
              <li>
                <span className="font-semibold">MongoDB Atlas:</span> For
                storing your design data and account information.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Your Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Depending on your location, you may have certain rights regarding
              your personal information:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The right to access your personal data</li>
              <li>The right to rectify inaccurate personal data</li>
              <li>The right to request deletion of your personal data</li>
              <li>The right to restrict processing of your personal data</li>
              <li>The right to data portability</li>
              <li>The right to object to processing of your personal data</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, please contact us using the
              information provided below.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Children's Privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our service is not intended for use by children under the age of
              13. We do not knowingly collect personal information from children
              under 13. If you are a parent or guardian and believe that your
              child has provided us with personal information, please contact us
              so that we can take necessary actions.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">
              Changes to This Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may update our Privacy Policy from time to time. We will notify
              you of any changes by posting the new Privacy Policy on this page
              and updating the "Last updated" date at the top of this page.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically for any
              changes. Changes to this Privacy Policy are effective when they
              are posted on this page.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions about this Privacy Policy, please
              contact us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>By email: support@everwoodus.com</li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
