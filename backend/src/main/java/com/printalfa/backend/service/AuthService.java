package com.printalfa.backend.service;

import com.printalfa.backend.dto.AuthRequest;
import com.printalfa.backend.dto.AuthResponse;
import com.printalfa.backend.dto.SignupRequest;
import com.printalfa.backend.entity.PasswordResetToken;
import com.printalfa.backend.entity.User;
import com.printalfa.backend.entity.UserSession;
import com.printalfa.backend.enums.SessionStatus;
import com.printalfa.backend.enums.UserRole;
import com.printalfa.backend.repository.PasswordResetTokenRepository;
import com.printalfa.backend.repository.UserRepository;
import com.printalfa.backend.repository.UserSessionRepository;
import com.printalfa.backend.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserSessionRepository userSessionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    public AuthService(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider,
                       UserRepository userRepository, PasswordEncoder passwordEncoder,
                       UserSessionRepository userSessionRepository, PasswordResetTokenRepository passwordResetTokenRepository,
                       EmailService emailService) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userSessionRepository = userSessionRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailService = emailService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request, String deviceId, String deviceName, String appVersion) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already in use");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setRole(UserRole.ROLE_SHOP_ADMIN);
        
        userRepository.save(user);

        // Auto-login after signup
        return authenticateAndCreateSession(request.getEmail(), request.getPassword(), deviceId, deviceName, appVersion);
    }

    @Transactional
    public AuthResponse login(AuthRequest request, String deviceId, String deviceName, String appVersion) {
        return authenticateAndCreateSession(request.getEmail(), request.getPassword(), deviceId, deviceName, appVersion);
    }
    
    private AuthResponse authenticateAndCreateSession(String email, String password, String deviceId, String deviceName, String appVersion) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );
        
        SecurityContextHolder.getContext().setAuthentication(authentication);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
                
        // 1. Revoke existing active sessions
        revokeAllUserSessions(user, "NEW_LOGIN");
        
        // 2. Create new session
        String sessionToken = UUID.randomUUID().toString();
        UserSession newSession = new UserSession();
        newSession.setUser(user);
        newSession.setSessionToken(sessionToken);
        newSession.setDeviceId(deviceId != null ? deviceId : "UNKNOWN");
        newSession.setDeviceName(deviceName);
        newSession.setAppVersion(appVersion);
        newSession.setCreatedAt(LocalDateTime.now());
        newSession.setExpiresAt(LocalDateTime.now().plusDays(1)); // Match JWT expiry
        newSession.setStatus(SessionStatus.ACTIVE);
        
        userSessionRepository.save(newSession);

        // 3. Generate JWT with session ID
        String jwt = tokenProvider.generateTokenWithSession(authentication, sessionToken);

        return new AuthResponse(
                jwt,
                user.getEmail(),
                user.getRole().name(),
                user.getShop() != null ? user.getShop().getId() : null,
                user.getShop() != null ? user.getShop().getName() : null,
                user.getShop() != null ? user.getShop().getSlug() : null,
                user.getShop() != null,
                user.getShop() != null ? user.getShop().getApiKey() : null,
                user.getName()
        );
    }
    
    @Transactional
    public void revokeAllUserSessions(User user, String reason) {
        List<UserSession> activeSessions = userSessionRepository.findByUserIdAndStatus(user.getId(), SessionStatus.ACTIVE);
        for (UserSession session : activeSessions) {
            session.setStatus(SessionStatus.REVOKED);
            session.setRevokedAt(LocalDateTime.now());
            session.setRevokedReason(reason);
            userSessionRepository.save(session);
        }
    }

    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            SecureRandom random = new SecureRandom();
            byte[] bytes = new byte[32];
            random.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setUser(user);
            resetToken.setToken(token);
            resetToken.setCreatedAt(LocalDateTime.now());
            resetToken.setExpiresAt(LocalDateTime.now().plusHours(1));
            resetToken.setUsed(false);
            
            passwordResetTokenRepository.save(resetToken);
            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });
        // We always return success even if user doesn't exist for security reasons (don't leak email existence)
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));
                
        if (resetToken.isUsed() || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token has expired or already been used");
        }
        
        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
        
        // Revoke all sessions so they have to login again
        revokeAllUserSessions(user, "PASSWORD_RESET");
    }
}
