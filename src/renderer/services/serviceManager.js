/**
 * @file Agregador central de serviços (Facade). Instancia e gerencia o acesso 
 * a todos os serviços de domínio da aplicação de forma centralizada.
 */

import { FileService } from './fileService.js';
import { BookService } from './bookService.js';

/**
 * Gerencia todas as classes de serviços.
 * @class
 */
export class ServiceManager {
    /**
     * Inicializa e agrupa todos os serviços da aplicação.
     * @param {Object} state - Instância do estado global da aplicação.
     * @constructor
     */
    constructor(state) {
        console.log("ServiceManager constructor");
        this.state = state;

        // Instancia os serviços injetando as dependências necessárias
        this.file = new FileService(this.state);
        this.book = new BookService(this.state, this.file);
    }
}

console.log("[SERVICE-MANAGER.JS]");