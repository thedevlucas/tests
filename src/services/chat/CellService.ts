// Models
import { Cellphone } from "../../models/Cellphone";
import { User } from "../../models/User";
import { Debtor } from "../../models/Debtor";
// Schemas
import { cellphoneInterface } from "../../schemas/CellphoneSchema";
// Custom error
import { httpError } from "../../config/CustomError";
// Other services
import { deleteChat } from "./ChatService";
import { Role } from "../../Contexts/BillingPlatform/company/domain/Company";

export async function getCellphones(idUser: number) {
  const cellphones = await Debtor.findAll({
    where: { id_user: idUser },
    attributes: ["name", "id", "paid"],
    include: [
      {
        model: Cellphone,
        attributes: ["from", "to", "id"],
        required: true,
      },
    ],
  });
  return cellphones;
}

export async function createCellphone(
  cellphoneInterface: cellphoneInterface,
  idUser: number
) {
  const { from, to, document, cellphone, country_code, phone_type, notes, debtor_id } = cellphoneInterface;

  // Handle both old and new formats
  const fromNumber = from || cellphone;
  const toNumber = to || cellphone;

  let debtor;
  
  if (debtor_id) {
    debtor = await Debtor.findOne({
      where: { id: debtor_id, id_user: idUser },
    });
  } else {
    debtor = await Debtor.findOne({
      where: { document, id_user: idUser },
    });
  }

  if (!debtor) {
    throw new httpError("No se encontró el cliente", 404);
  }

  await Cellphone.create({ 
    from: fromNumber, 
    to: toNumber, 
    id_debtor: debtor.id 
  });
  
  return { message: "Celular creado" };
}

export async function deleteCellphone(id: number, idUser: number) {
  const userAction = await User.findOne({ where: { id: idUser } });

  const cellphone = await Cellphone.findOne({ where: { id: id } });
  if (!cellphone) throw new httpError("No se encontró el celular", 404);

  const debtor = await Debtor.findOne({ where: { id: cellphone.id_debtor } });
  if (debtor?.id_user != idUser && userAction?.role === Role.USER)
    throw new httpError("No tienes permisos para eliminar este celular", 403);

  // Delete chats too
  await deleteChat(idUser, cellphone.from, cellphone.to);
  // Delete cellphone
  await cellphone.destroy();
  return { message: "Celular eliminado" };
}
