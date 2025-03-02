"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfService() {
  return (
    <div className="container max-w-4xl py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-6 text-center">
          Terms of Service
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Introduction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Welcome to Everwood. These Terms of Service ("Terms") govern your
              access to and use of our website, products, and services
              ("Services"). Please read these Terms carefully before using our
              Services.
            </p>
            <p>
              By accessing or using our Services, you agree to be bound by these
              Terms. If you do not agree to these Terms, you may not access or
              use the Services.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Account Registration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              To access certain features of our Services, you may be required to
              register for an account. When you register, you agree to provide
              accurate, current, and complete information about yourself.
            </p>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Maintaining the confidentiality of your account credentials
              </li>
              <li>All activities that occur under your account</li>
              <li>
                Notifying us immediately of any unauthorized use of your account
              </li>
            </ul>
            <p className="mt-4">
              We reserve the right to suspend or terminate your account if any
              information provided during registration or thereafter proves to
              be inaccurate, false, or misleading.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">User Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Our Services allow you to create, upload, store, and share
              content, including designs, palettes, and configurations ("User
              Content"). You retain all rights to your User Content.
            </p>
            <p>
              By creating, uploading, or sharing User Content, you grant us a
              worldwide, non-exclusive, royalty-free license to use, reproduce,
              modify, adapt, publish, translate, and distribute your User
              Content for the purpose of providing and improving our Services.
            </p>
            <p>You represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You own or have the necessary rights to your User Content</li>
              <li>
                Your User Content does not violate the rights of any third party
              </li>
              <li>
                Your User Content complies with these Terms and applicable laws
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Prohibited Conduct</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Use the Services in any way that violates any applicable law or
                regulation
              </li>
              <li>
                Impersonate any person or entity, or falsely state or
                misrepresent your affiliation with a person or entity
              </li>
              <li>
                Interfere with or disrupt the Services or servers or networks
                connected to the Services
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Services
              </li>
              <li>
                Use the Services to send unsolicited communications, promotions,
                or advertisements
              </li>
              <li>
                Use the Services to collect or harvest any personally
                identifiable information
              </li>
              <li>
                Use the Services for any purpose that is harmful, fraudulent,
                deceptive, threatening, harassing, defamatory, obscene, or
                otherwise objectionable
              </li>
              <li>
                Use any robot, spider, or other automatic device to access the
                Services
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Intellectual Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Services and their original content, features, and
              functionality are owned by Everwood and are protected by
              international copyright, trademark, patent, trade secret, and
              other intellectual property or proprietary rights laws.
            </p>
            <p>
              You may not copy, modify, create derivative works of, publicly
              display, publicly perform, republish, or transmit any of the
              material obtained through the Services, except as necessary for
              your personal, non-commercial use.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Termination</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may terminate or suspend your account and access to the
              Services immediately, without prior notice or liability, for any
              reason, including if you breach these Terms.
            </p>
            <p>
              Upon termination, your right to use the Services will immediately
              cease. If you wish to terminate your account, you may simply
              discontinue using the Services or contact us to request account
              deletion.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Disclaimer of Warranties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The Services are provided on an "AS IS" and "AS AVAILABLE" basis,
              without any warranties of any kind, either express or implied.
            </p>
            <p>We do not warrant that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                The Services will function uninterrupted, secure, or available
                at any particular time or location
              </li>
              <li>Any errors or defects will be corrected</li>
              <li>
                The Services are free of viruses or other harmful components
              </li>
              <li>
                The results of using the Services will meet your requirements
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              To the maximum extent permitted by law, in no event shall
              Everwood, its directors, employees, partners, agents, suppliers,
              or affiliates be liable for any indirect, incidental, special,
              consequential, or punitive damages, including without limitation,
              loss of profits, data, use, goodwill, or other intangible losses,
              resulting from:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Your access to or use of or inability to access or use the
                Services
              </li>
              <li>Any conduct or content of any third party on the Services</li>
              <li>Any content obtained from the Services</li>
              <li>
                Unauthorized access, use, or alteration of your transmissions or
                content
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Indemnification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              You agree to defend, indemnify, and hold harmless Everwood, its
              directors, employees, partners, agents, suppliers, and affiliates
              from and against any claims, liabilities, damages, judgments,
              awards, losses, costs, expenses, or fees (including reasonable
              attorneys' fees) arising out of or relating to your violation of
              these Terms or your use of the Services.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Governing Law</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              These Terms shall be governed and construed in accordance with the
              laws of the United States, without regard to its conflict of law
              provisions.
            </p>
            <p>
              Our failure to enforce any right or provision of these Terms will
              not be considered a waiver of those rights. If any provision of
              these Terms is held to be invalid or unenforceable by a court, the
              remaining provisions of these Terms will remain in effect.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Changes to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We reserve the right to modify or replace these Terms at any time.
              We will provide notice of any changes by posting the new Terms on
              this page and updating the "Last updated" date.
            </p>
            <p>
              By continuing to access or use our Services after those revisions
              become effective, you agree to be bound by the revised Terms. If
              you do not agree to the new Terms, you are no longer authorized to
              use the Services.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Contact Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              If you have any questions about these Terms, please contact us:
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
