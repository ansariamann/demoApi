package com.apiexplorer.config;

import org.sqlite.SQLiteConfig;
import org.sqlite.SQLiteDataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;

@Configuration
public class DatabaseConfig {

    @Bean
    public NamedParameterJdbcTemplate namedParameterJdbcTemplate(JdbcTemplate jdbcTemplate) {
        return new NamedParameterJdbcTemplate(jdbcTemplate);
    }

    @Bean(name = "readOnlyDataSource")
    public DataSource readOnlyDataSource(@Value("${spring.datasource.url:jdbc:sqlite:./api_explorer.db}") String url) {
        SQLiteConfig config = new SQLiteConfig();
        config.setReadOnly(true);
        SQLiteDataSource ds = new SQLiteDataSource(config);
        ds.setUrl(url);
        return ds;
    }
}
