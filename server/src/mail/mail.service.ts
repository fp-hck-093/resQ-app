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
      console.log('[MailService] EMAIL_USER/EMAIL_PASS not set. Skipping send.');
      console.log('[MailService] Mock reset link:', resetLink);
      return;
    }

    const html = `
      <div style="margin:0; padding:0; background-color:#f6f8fb; font-family:Arial, Helvetica, sans-serif; color:#1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#fff1f2 0%,#f6f8fb 100%); padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
                <tr>
                  <td style="padding-bottom:18px; text-align:center;">
                    <div style="display:inline-block; background:#dc2626; color:#ffffff; border-radius:18px; padding:10px 18px; font-size:20px; font-weight:900; letter-spacing:0.08em;">
                      resQ
                    </div>
                    <div style="margin-top:12px; font-size:24px; font-weight:800; color:#111827;">
                      resQ Emergency App
                    </div>
                    <div style="margin-top:6px; font-size:13px; color:#64748b;">
                      Reset akses akun kamu dengan aman
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="background:#ffffff; border:1px solid #e5e7eb; border-radius:28px; overflow:hidden; box-shadow:0 24px 60px rgba(15,23,42,0.08);">
                    <div style="height:6px; background:linear-gradient(90deg,#dc2626 0%,#f97316 100%);"></div>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:40px 36px 16px 36px; text-align:center;">
                          <div style="display:inline-block; background:#fff1f2; color:#dc2626; border-radius:999px; padding:8px 14px; font-size:12px; font-weight:800; letter-spacing:0.18em;">
                            RESET PASSWORD
                          </div>
                          <h1 style="margin:20px 0 12px 0; font-size:34px; line-height:1.2; color:#0f172a; font-weight:900;">
                            Buat password baru
                          </h1>
                          <p style="margin:0; font-size:16px; line-height:1.8; color:#475569;">
                            Halo, <strong style="color:#0f172a;">${name}</strong>. Kami menerima permintaan untuk mereset password akun resQ kamu.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:8px 36px 0 36px;">
                          <div style="border-radius:22px; background:linear-gradient(180deg,#fff5f5 0%,#ffffff 100%); border:1px solid #fecaca; padding:24px;">
                            <p style="margin:0 0 14px 0; font-size:15px; line-height:1.8; color:#475569;">
                              Klik tombol di bawah ini untuk melanjutkan proses reset password. Demi keamanan, link ini hanya berlaku selama <strong style="color:#dc2626;">15 menit</strong>.
                            </p>

                            <div style="padding:12px 0 4px 0; text-align:center;">
                              <a href="${resetLink}" style="display:inline-block; background:linear-gradient(90deg,#dc2626 0%,#f97316 100%); color:#ffffff; text-decoration:none; font-size:16px; font-weight:800; padding:16px 28px; border-radius:16px; box-shadow:0 14px 30px rgba(220,38,38,0.28);">
                                Reset Password Saya
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:24px 36px 0 36px;">
                          <div style="border-radius:18px; background:#f8fafc; border:1px solid #e2e8f0; padding:18px 20px;">
                            <div style="font-size:13px; font-weight:800; letter-spacing:0.12em; color:#94a3b8; margin-bottom:10px;">
                              TIDAK BISA KLIK TOMBOL?
                            </div>
                            <div style="font-size:14px; line-height:1.8; color:#475569; word-break:break-word;">
                              Salin dan buka link berikut di browser kamu:<br />
                              <a href="${resetLink}" style="color:#dc2626; text-decoration:none;">${resetLink}</a>
                            </div>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:24px 36px 40px 36px;">
                          <div style="border-top:1px solid #e5e7eb; padding-top:20px; font-size:14px; line-height:1.8; color:#64748b;">
                            Kalau kamu tidak merasa meminta reset password, abaikan email ini. Password lama kamu akan tetap aman.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:18px; text-align:center; font-size:12px; line-height:1.8; color:#94a3b8;">
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
