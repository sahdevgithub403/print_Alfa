package com.printalfa.backend.service;

import com.printalfa.backend.dto.AuthRequest;
import com.printalfa.backend.dto.AuthResponse;
import com.printalfa.backend.entity.User;
import com.printalfa.backend.repository.UserRepository;
import com.printalfa.backend.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;

    public AuthService(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider, UserRepository userRepository) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
    }

    public AuthResponse login(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return new AuthResponse(
                jwt,
                user.getEmail(),
                user.getRole().name(),
                user.getShop() != null ? user.getShop().getId() : null,
                user.getShop() != null ? user.getShop().getName() : null,
                user.getShop() != null ? user.getShop().getSlug() : null
        );
    }
}
