package com.crm;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class CrmApplication {

    public static void main(String[] args) {
        // Force UTC so the JDBC driver's startup TimeZone parameter is always
        // a value Postgres recognises, regardless of the host OS timezone
        // (e.g. "Asia/Calcutta" is rejected by the postgres:16 image's tzdata).
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(CrmApplication.class, args);
    }

}
