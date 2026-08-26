package com.printalfa.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Arrays;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;
    
    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    public void sendPasswordResetEmail(String to, String resetToken) {
        String subject = "PrintAlfa - Password Reset";
        String text = "You have requested to reset your password.\n\n" +
                "Use the following token to reset your password:\n" +
                resetToken + "\n\n" +
                "This token will expire in 1 hour.\n" +
                "If you did not request a password reset, please ignore this email.";

        if (Arrays.asList(activeProfile.split(",")).contains("dev") || mailSender == null) {
            logger.info("DEV MODE - Password Reset Email to {}:\nSubject: {}\n{}", to, subject, text);
        } else {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(to);
                message.setSubject(subject);
                message.setText(text);
                mailSender.send(message);
                logger.info("Sent password reset email to {}", to);
            } catch (Exception e) {
                logger.error("Failed to send password reset email to {}", to, e);
            }
        }
    }
}
