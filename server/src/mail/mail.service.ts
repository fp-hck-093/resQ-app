import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private createTransporter() {
    const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendResetPasswordEmail(
    to: string,
    name: string,
    resetLink: string,
  ): Promise<void> {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(
        '[MailService] EMAIL_USER/EMAIL_PASS not set. Skipping send.',
      );
      console.log('[MailService] Mock reset link:', resetLink);
      return;
    }

    const html = `
      <div style="margin:0; padding:0; background-color:#f1f5f9; font-family:Arial, Helvetica, sans-serif; color:#1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">

                <!-- Header logo -->
                <tr>
                  <td style="padding-bottom:20px; text-align:center;">
                    <div style="display:inline-block; background:#3b5fca; color:#ffffff; border-radius:16px; padding:8px 20px; font-size:18px; font-weight:900; letter-spacing:0.06em;">
                      resQ
                    </div>
                    <div style="margin-top:10px; font-size:22px; font-weight:800; color:#0f172a;">
                      resQ Emergency App
                    </div>
                    <div style="margin-top:4px; font-size:13px; color:#64748b;">
                      Reset akses akun kamu dengan aman
                    </div>
                  </td>
                </tr>

                <!-- Card -->
                <tr>
                  <td style="background:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden; box-shadow:0 20px 50px rgba(15,23,42,0.08);">

                    <!-- Blue top bar -->
                    <div style="height:6px; background:linear-gradient(90deg,#3b5fca 0%,#6366f1 100%);"></div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">

                      <!-- Title section -->
                      <tr>
                        <td style="padding:36px 32px 16px 32px; text-align:center;">
                          <div style="display:inline-block; background:#eff6ff; color:#3b5fca; border-radius:999px; padding:6px 16px; font-size:11px; font-weight:800; letter-spacing:0.18em;">
                            RESET PASSWORD
                          </div>
                          <h1 style="margin:18px 0 10px 0; font-size:30px; line-height:1.2; color:#0f172a; font-weight:900;">
                            Buat password baru
                          </h1>
                          <p style="margin:0; font-size:15px; line-height:1.8; color:#475569;">
                            Halo, <strong style="color:#0f172a;">${name}</strong>. Kami menerima permintaan untuk mereset password akun resQ kamu.
                          </p>
                        </td>
                      </tr>

                      <!-- CTA section -->
                      <tr>
                        <td style="padding:8px 32px 0 32px;">
                          <div style="border-radius:16px; background:#eff6ff; border:1px solid #bfdbfe; padding:22px;">
                            <p style="margin:0 0 16px 0; font-size:14px; line-height:1.8; color:#475569;">
                              Klik tombol di bawah ini untuk melanjutkan proses reset password. Demi keamanan, link ini hanya berlaku selama <strong style="color:#3b5fca;">15 menit</strong>.
                            </p>
                            <div style="text-align:center; padding:4px 0;">
                              <a href="${resetLink}" style="display:inline-block; background:#3b5fca; color:#ffffff; text-decoration:none; font-size:15px; font-weight:800; padding:14px 32px; border-radius:14px; box-shadow:0 8px 24px rgba(59,95,202,0.30); letter-spacing:0.02em;">
                                Reset Password Saya
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <!-- Cannot click section -->
                      <tr>
                        <td style="padding:20px 32px 0 32px;">
                          <div style="border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0; padding:16px 18px;">
                            <div style="font-size:11px; font-weight:800; letter-spacing:0.14em; color:#94a3b8; margin-bottom:8px;">
                              TIDAK BISA KLIK TOMBOL?
                            </div>
                            <div style="font-size:13px; line-height:1.8; color:#475569; word-break:break-word;">
                              Salin dan buka link berikut di browser kamu:<br />
                              <a href="${resetLink}" style="color:#3b5fca; text-decoration:none; word-break:break-all;">${resetLink}</a>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <!-- Footer note -->
                      <tr>
                        <td style="padding:20px 32px 32px 32px;">
                          <div style="border-top:1px solid #e2e8f0; padding-top:16px; font-size:13px; line-height:1.8; color:#64748b;">
                            Kalau kamu tidak merasa meminta reset password, abaikan email ini. Password lama kamu akan tetap aman.
                          </div>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>

                <!-- Bottom caption -->
                <tr>
                  <td style="padding-top:16px; text-align:center; font-size:12px; line-height:1.8; color:#94a3b8;">
                    Email ini dikirim otomatis oleh <strong style="color:#64748b;">resQ Emergency App</strong>.<br />
                    Mohon jangan membalas email ini.
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    const transporter = this.createTransporter();
    await transporter.sendMail({
      from: `"resQ Emergency App" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Reset Password - resQ App',
      html,
    });
  }
}
